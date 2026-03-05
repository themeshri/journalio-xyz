'use client';

import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import { FlattenedTrade } from '@/lib/tradeCycles';
import { formatDuration, formatTime, formatValue, formatMarketCap } from '@/lib/formatters';
import { getCommentsByCategory, type TradeComment } from '@/lib/trade-comments';
import { type Strategy, type StrategyRule } from '@/lib/strategies';
import { useWallet } from '@/lib/wallet-context';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EditTradeTab } from '@/components/EditTradeTab';
import { toast } from 'sonner';

export interface TradeRuleResult {
  ruleId: string;
  ruleGroupId: string;
  followed: boolean;
}

export interface JournalData {
  strategy: string;
  strategyId?: string | null;
  ruleResults?: TradeRuleResult[];
  emotionalState: string;
  buyNotes: string;
  buyRating: number;
  exitPlan: string;
  sellRating: number;
  followedExitRule: boolean | null;
  sellMistakes: string[];
  sellNotes: string;
  attachment?: string;
  entryCommentId?: string | null;
  exitCommentId?: string | null;
  managementCommentId?: string | null;
  emotionTag?: string | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  journaledAt?: string;
  // Legacy fields preserved for backward compat when reading old data
  buyCategory?: string;
  fomoLevel?: number;
  energyLevel?: number;
}

interface JournalModalProps {
  trade: FlattenedTrade;
  initialData: JournalData | null;
  tokenLogo?: string | null;
  onSave: (data: JournalData) => void | Promise<void>;
  onSaveAndNext?: (data: JournalData) => void | Promise<void>;
  onClose: () => void;
}


const mistakeOptions = [
  'Entered too early',
  'Entered too late',
  'Position size too large',
  'Position size too small',
  "Didn't follow plan",
  'Emotional decision',
  'Ignored stop loss',
  'Held too long',
  'Sold too early',
  'Poor risk management',
  "Didn't do enough research",
  'Overtraded',
  'Other',
];

const emotionTags = [
  { id: 'confident', emoji: '\ud83d\udcaa', label: 'Confident' },
  { id: 'calm', emoji: '\ud83e\uddd8', label: 'Calm' },
  { id: 'anxious', emoji: '\ud83d\ude30', label: 'Anxious' },
  { id: 'fomo', emoji: '\ud83d\ude31', label: 'FOMO' },
  { id: 'revenge', emoji: '\ud83d\ude21', label: 'Revenge' },
  { id: 'greedy', emoji: '\ud83e\udd11', label: 'Greedy' },
  { id: 'fearful', emoji: '\ud83d\ude28', label: 'Fearful' },
  { id: 'bored', emoji: '\ud83d\ude34', label: 'Bored' },
  { id: 'euphoric', emoji: '\ud83e\udd29', label: 'Euphoric' },
  { id: 'frustrated', emoji: '\ud83d\ude24', label: 'Frustrated' },
  { id: 'neutral', emoji: '\ud83d\ude10', label: 'Neutral' },
];

// Strategy loading is now from lib/strategies.ts

function ratingDot(rating: TradeComment['rating']) {
  if (rating === 'positive') return 'bg-emerald-500';
  if (rating === 'negative') return 'bg-red-500';
  return 'bg-zinc-400';
}

const JournalModal = memo(function JournalModal({
  trade,
  initialData,
  tokenLogo,
  onSave,
  onSaveAndNext,
  onClose,
}: JournalModalProps) {
  // Migrate old buyCategory -> strategy if needed
  const initialStrategy = initialData?.strategy || initialData?.buyCategory || '';
  const [strategy, setStrategy] = useState(initialStrategy);
  const emotionalState = '';
  const buyNotes = '';
  const [buyRating, setBuyRating] = useState(initialData?.buyRating || 0);
  const [exitPlan, setExitPlan] = useState(initialData?.exitPlan || '');
  const [sellRating, setSellRating] = useState(initialData?.sellRating || 0);
  const [followedExitRule, setFollowedExitRule] = useState<boolean | null>(initialData?.followedExitRule ?? null);
  const [sellMistakes, setSellMistakes] = useState<string[]>(initialData?.sellMistakes || []);
  const sellNotes = '';
  // Multi-image: stored as JSON array string in DB, backward-compat with single base64 string
  const [attachments, setAttachments] = useState<string[]>(() => {
    const raw = initialData?.attachment;
    if (!raw) return [];
    if (raw.startsWith('[')) {
      try { return JSON.parse(raw) as string[]; } catch { return []; }
    }
    return [raw]; // legacy single image
  });
  const { strategies, tradeComments } = useWallet();
  const [strategyId, setStrategyId] = useState<string | null>(initialData?.strategyId ?? null);
  const [ruleResults, setRuleResults] = useState<TradeRuleResult[]>(initialData?.ruleResults ?? []);
  const [entryCommentId, setEntryCommentId] = useState<string | null>(initialData?.entryCommentId ?? null);
  const [exitCommentId, setExitCommentId] = useState<string | null>(initialData?.exitCommentId ?? null);
  const [managementCommentId, setManagementCommentId] = useState<string | null>(initialData?.managementCommentId ?? null);
  const [emotionTag, setEmotionTag] = useState<string | null>(initialData?.emotionTag ?? null);
  const [stopLoss, setStopLoss] = useState<number | null>(initialData?.stopLoss ?? null);
  const [takeProfit, setTakeProfit] = useState<number | null>(initialData?.takeProfit ?? null);
  const [saving, setSaving] = useState(false);

  // Track if form has been modified
  const initialSnapshot = useRef({
    strategy: initialStrategy,
    buyRating: initialData?.buyRating || 0,
    sellRating: initialData?.sellRating || 0,
    exitPlan: initialData?.exitPlan || '',
    strategyId: initialData?.strategyId ?? null,
    entryCommentId: initialData?.entryCommentId ?? null,
    exitCommentId: initialData?.exitCommentId ?? null,
    managementCommentId: initialData?.managementCommentId ?? null,
    emotionTag: initialData?.emotionTag ?? null,
  });
  const isDirty =
    strategy !== initialSnapshot.current.strategy ||
    buyRating !== initialSnapshot.current.buyRating ||
    sellRating !== initialSnapshot.current.sellRating ||
    exitPlan !== initialSnapshot.current.exitPlan ||
    strategyId !== initialSnapshot.current.strategyId ||
    entryCommentId !== initialSnapshot.current.entryCommentId ||
    exitCommentId !== initialSnapshot.current.exitCommentId ||
    managementCommentId !== initialSnapshot.current.managementCommentId ||
    emotionTag !== initialSnapshot.current.emotionTag;

  const handleClose = useCallback(() => {
    if (isDirty && !window.confirm('You have unsaved changes. Discard them?')) return;
    onClose();
  }, [isDirty, onClose]);

  const entryComments = getCommentsByCategory(tradeComments, 'entry');
  const exitComments = getCommentsByCategory(tradeComments, 'exit');
  const managementComments = getCommentsByCategory(tradeComments, 'management');

  const buildData = useCallback((): JournalData => ({
    strategy,
    strategyId,
    ruleResults,
    emotionalState,
    buyNotes,
    buyRating,
    exitPlan,
    sellRating,
    followedExitRule,
    sellMistakes,
    sellNotes,
    attachment: attachments.length > 0 ? JSON.stringify(attachments) : undefined,
    entryCommentId,
    exitCommentId,
    managementCommentId,
    emotionTag,
    stopLoss,
    takeProfit,
    journaledAt: initialData?.journaledAt || new Date().toISOString(),
  }), [strategy, strategyId, ruleResults, emotionalState, buyNotes, buyRating, exitPlan, sellRating, followedExitRule, sellMistakes, sellNotes, attachments, entryCommentId, exitCommentId, managementCommentId, emotionTag, stopLoss, takeProfit, initialData?.journaledAt]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(buildData());
    } finally {
      setSaving(false);
    }
  }, [buildData, onSave]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachments((prev) => [...prev, reader.result as string]);
    };
    reader.onerror = () => {
      toast.error('Failed to read image file');
    };
    reader.readAsDataURL(file);
    // Reset the input so the same file can be re-uploaded
    e.target.value = '';
  }, []);

  const toggleMistake = useCallback((mistake: string) => {
    setSellMistakes((prev) =>
      prev.includes(mistake) ? prev.filter((m) => m !== mistake) : [...prev, mistake]
    );
  }, []);

  const avgBuyPrice = trade.totalBuyAmount > 0 ? trade.totalBuyValue / trade.totalBuyAmount : 0;
  const avgSellPrice = trade.totalSellAmount > 0 ? trade.totalSellValue / trade.totalSellAmount : 0;

  const activeStrategies = strategies.filter((s) => !s.isArchived);

  // Get the selected strategy object for rule display
  const selectedStrategy = strategyId ? strategies.find((s) => s.id === strategyId) : null;

  // Determine trade outcome for showWhen filtering
  const tradeOutcome: 'winner' | 'loser' | 'breakeven' =
    trade.profitLoss > 0.01 ? 'winner' : trade.profitLoss < -0.01 ? 'loser' : 'breakeven';

  // Get applicable rules (filtered by showWhen)
  const getApplicableRules = (strat: Strategy) => {
    const rules: { rule: StrategyRule; groupId: string; groupName: string }[] = [];
    for (const group of strat.ruleGroups) {
      for (const rule of group.rules) {
        if (rule.showWhen === 'always' || rule.showWhen === tradeOutcome) {
          rules.push({ rule, groupId: group.id, groupName: group.name });
        }
      }
    }
    return rules;
  };

  // Follow rate calculation
  const followRate = selectedStrategy ? (() => {
    const applicable = getApplicableRules(selectedStrategy);
    const total = applicable.length;
    const followed = ruleResults.filter((r) => r.followed).length;
    const requiredRules = applicable.filter((a) => a.rule.isRequired);
    const requiredTotal = requiredRules.length;
    const requiredFollowed = requiredRules.filter((a) =>
      ruleResults.find((r) => r.ruleId === a.rule.id && r.followed)
    ).length;
    return {
      total,
      followed,
      percent: total > 0 ? Math.round((followed / total) * 100) : 0,
      requiredTotal,
      requiredFollowed,
      requiredPercent: requiredTotal > 0 ? Math.round((requiredFollowed / requiredTotal) * 100) : 0,
    };
  })() : null;

  function handleStrategyChange(id: string) {
    if (id === '__add_new') {
      window.open('/strategies', '_blank');
      return;
    }
    const strat = strategies.find((s) => s.id === id);
    if (strat) {
      setStrategyId(id);
      setStrategy(strat.name);
      // Initialize rule results for all applicable rules (preserve existing results)
      const applicable = getApplicableRules(strat);
      const newResults = applicable.map((a) => {
        const existing = ruleResults.find((r) => r.ruleId === a.rule.id);
        return existing || { ruleId: a.rule.id, ruleGroupId: a.groupId, followed: false };
      });
      setRuleResults(newResults);
    } else {
      setStrategyId(null);
      setStrategy('');
      setRuleResults([]);
    }
  }

  function toggleRule(ruleId: string, groupId: string) {
    setRuleResults((prev) => {
      const existing = prev.find((r) => r.ruleId === ruleId);
      if (existing) {
        return prev.map((r) => r.ruleId === ruleId ? { ...r, followed: !r.followed } : r);
      }
      return [...prev, { ruleId, ruleGroupId: groupId, followed: true }];
    });
  }

  function renderCommentSelect(
    label: string,
    comments: TradeComment[],
    value: string | null,
    onChange: (v: string | null) => void
  ) {
    return (
      <div>
        <Label className="text-xs mb-1.5">{label}</Label>
        <Select
          value={value || ''}
          onValueChange={(v) => onChange(v === '__clear' ? null : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__clear" className="text-muted-foreground">
              None
            </SelectItem>
            {comments.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${ratingDot(c.rating)}`} />
                  {c.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <Dialog open onOpenChange={() => handleClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            {tokenLogo ? (
              <img
                src={tokenLogo}
                alt={trade.token}
                className="w-6 h-6 rounded-full"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                {trade.token.charAt(0)}
              </div>
            )}
            {trade.token} - Trade Journal
          </DialogTitle>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
            <span>Start: {formatTime(trade.startDate)}</span>
            {trade.endDate && <span>End: {formatTime(trade.endDate)}</span>}
            {trade.duration && <span>Duration: {formatDuration(trade.duration)}</span>}
            <span className="text-emerald-600">
              Buy MC: {formatMarketCap(avgBuyPrice * 1_000_000_000)}
            </span>
            {avgSellPrice > 0 && (
              <span className="text-red-600">
                Sell MC: {formatMarketCap(avgSellPrice * 1_000_000_000)}
              </span>
            )}
            <span
              className={`font-medium ${trade.profitLoss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
            >
              P/L: {trade.profitLoss >= 0 ? '+' : ''}
              {formatValue(trade.profitLoss)}
            </span>
          </div>
        </DialogHeader>

        <Tabs defaultValue="journal" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full shrink-0">
            <TabsTrigger value="journal" className="flex-1">Journal</TabsTrigger>
            <TabsTrigger value="edit" className="flex-1">Edit Trade</TabsTrigger>
          </TabsList>

          <TabsContent value="journal" className="overflow-y-auto flex-1 -mx-6 px-6 mt-0">
          <div className="space-y-6 pt-4">
          {/* Buy Section */}
          <section>
            <h4 className="text-sm font-medium mb-3">Journal the Buy</h4>

            <div className="space-y-4">
              <div>
                <Label className="text-xs mb-1.5">
                  Strategy
                </Label>
                <Select value={strategyId || ''} onValueChange={handleStrategyChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a strategy...">
                      {selectedStrategy && (
                        <span className="flex items-center gap-1.5">
                          <span>{selectedStrategy.icon}</span>
                          <span>{selectedStrategy.name}</span>
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {activeStrategies.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-1.5">
                          <span>{s.icon}</span>
                          <span>{s.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                    {activeStrategies.length > 0 && <Separator className="my-1" />}
                    <SelectItem value="__add_new" className="text-muted-foreground">
                      + Manage strategies &#x2197;
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Strategy Rule Checklist */}

              {/* Emotion Tag Grid */}
              <div>
                <Label className="text-xs mb-1.5">Emotion Tag</Label>
                <div className="grid grid-cols-4 gap-1.5 mt-1">
                  {emotionTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setEmotionTag(emotionTag === tag.id ? null : tag.id)}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border cursor-pointer transition-colors ${
                        emotionTag === tag.id
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'border-border text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      <span>{tag.emoji}</span>
                      <span>{tag.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Entry Comment */}
              {entryComments.length > 0 && renderCommentSelect(
                'Entry Comment',
                entryComments,
                entryCommentId,
                setEntryCommentId
              )}


              <div>
                <Label className="text-xs mb-1.5">Rate the entry execution</Label>
                <div className="flex gap-0.5 mt-1" role="group" aria-label="Entry rating">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setBuyRating(n)}
                      className={`w-7 h-7 text-sm rounded transition-colors ${
                        n <= buyRating
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                      aria-label={`Rate entry ${n} out of 10`}
                    >
                      {n}
                    </button>
                  ))}
                  {buyRating > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground self-center font-mono tabular-nums">
                      {buyRating}/10
                    </span>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="exit-plan" className="text-xs mb-1.5">
                  Your exit plan
                </Label>
                <Textarea
                  id="exit-plan"
                  value={exitPlan}
                  onChange={(e) => setExitPlan(e.target.value)}
                  placeholder="What's your target? When will you sell?"
                  rows={3}
                />
              </div>
              
              {/* Stop Loss and Take Profit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="stop-loss" className="text-xs mb-1.5">Stop Loss (MC)</Label>
                  <Input
                    id="stop-loss"
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={stopLoss ?? ''}
                    onChange={(e) => setStopLoss(e.target.value === '' ? null : parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="take-profit" className="text-xs mb-1.5">Take Profit (MC)</Label>
                  <Input
                    id="take-profit"
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={takeProfit ?? ''}
                    onChange={(e) => setTakeProfit(e.target.value === '' ? null : parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </section>

          <Separator />

          {/* Sell Section */}
          <section>
            <h4 className="text-sm font-medium mb-3">Sell Analysis</h4>

            <div className="space-y-4">
              {/* Rating */}
              <div>
                <Label className="text-xs mb-1.5">Rate the exit</Label>
                <div className="flex gap-0.5 mt-1" role="group" aria-label="Exit rating">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSellRating(star)}
                      className={`w-7 h-7 text-sm rounded transition-colors ${
                        star <= sellRating
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                      aria-label={`Rate ${star} out of 10`}
                    >
                      {star}
                    </button>
                  ))}
                  {sellRating > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground self-center font-mono tabular-nums">
                      {sellRating}/10
                    </span>
                  )}
                </div>
              </div>

              {/* Exit Comment */}
              {exitComments.length > 0 && renderCommentSelect(
                'Exit Comment',
                exitComments,
                exitCommentId,
                setExitCommentId
              )}

              {/* Followed Exit Rule */}
              <div>
                <Label className="text-xs mb-1.5">Did you follow your exit rule?</Label>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setFollowedExitRule(prev => prev === true ? null : true)}
                    className={`px-4 py-1.5 text-sm rounded-md border transition-colors ${
                      followedExitRule === true
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowedExitRule(prev => prev === false ? null : false)}
                    className={`px-4 py-1.5 text-sm rounded-md border transition-colors ${
                      followedExitRule === false
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              {/* Mistakes */}
              <div>
                <Label className="text-xs mb-1.5">Mistakes</Label>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  {mistakeOptions.map((mistake) => (
                    <label
                      key={mistake}
                      className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md border cursor-pointer transition-colors ${
                        sellMistakes.includes(mistake)
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'border-border text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={sellMistakes.includes(mistake)}
                        onChange={() => toggleMistake(mistake)}
                        className="sr-only"
                      />
                      {mistake}
                    </label>
                  ))}
                </div>
              </div>

              {/* Management Comment */}
              {managementComments.length > 0 && renderCommentSelect(
                'Management Comment',
                managementComments,
                managementCommentId,
                setManagementCommentId
              )}

            </div>
          </section>


          <Separator />

          {/* Attachments */}
          <section>
            <h4 className="text-sm font-medium mb-3">Attachments</h4>

            {attachments.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {attachments.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={img}
                      alt={`Attachment ${idx + 1}`}
                      className="w-full h-24 object-cover rounded-md border border-border"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 h-5 w-5 p-0 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      &times;
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="flex items-center justify-center w-full px-4 py-4 border border-dashed border-border rounded-md cursor-pointer hover:border-primary hover:bg-muted/30 transition-colors"
              >
                <p className="text-sm text-muted-foreground">
                  {attachments.length > 0 ? 'Upload another image' : 'Click to upload image'}
                </p>
              </label>
            </div>
          </section>
          </div>
          </TabsContent>

          <TabsContent value="edit" className="overflow-y-auto flex-1 -mx-6 px-6 mt-0 pt-4">
            <EditTradeTab trade={trade} />
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-4">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          {onSaveAndNext && (
            <Button variant="outline" size="sm" disabled={saving} onClick={async () => {
              setSaving(true);
              try {
                await onSaveAndNext(buildData());
              } finally {
                setSaving(false);
              }
            }}>
              {saving ? 'Saving...' : 'Save & Next'}
            </Button>
          )}
          <Button size="sm" disabled={saving} onClick={handleSave}>
            {saving ? 'Saving...' : 'Save Journal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default JournalModal;

'use client';

import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import { FlattenedTrade } from '@/lib/tradeCycles';
import { formatDuration, formatTime, formatValue, formatMarketCap } from '@/lib/formatters';
import { getCommentsByCategory, type TradeComment } from '@/lib/trade-comments';
import { computeTradeDiscipline } from '@/lib/discipline';
import { DisciplineMeter } from '@/components/overview/DisciplineMeter';
import { type Strategy, type StrategyRule } from '@/lib/strategies';
import { useWallet } from '@/lib/wallet-context';
import {
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
  Divider,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Tabs,
  Tab,
} from '@heroui/react';
import { EditTradeTab } from '@/components/EditTradeTab';
import { toast } from 'sonner';
import { RatingScale } from '@/components/ui/rating-scale';
import { YesNoToggle } from '@/components/ui/yes-no-toggle';

// JournalData / TradeRuleResult moved to lib/types/journal so lib modules can
// use them without importing the UI layer. Imported for this component's own
// use and re-exported here for back-compat with existing UI importers.
import type { JournalData, TradeRuleResult } from '@/lib/types/journal';
export type { JournalData, TradeRuleResult };

interface JournalModalProps {
  trade: FlattenedTrade;
  initialData: JournalData | null;
  tokenLogo?: string | null;
  onSave: (data: JournalData) => void | Promise<void>;
  onSaveAndNext?: (data: JournalData) => void | Promise<void>;
  onClose: () => void;
  currentIndex?: number;
  totalCount?: number;
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
  currentIndex,
  totalCount,
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

  // Quick mode: hide the heavier fields (strategy/rules, comments, exit plan,
  // SL/TP, attachments) by default so journaling is fast. Auto-expand when the
  // trade already has any of those set, so editing an existing journal shows them.
  const hasAdvancedData = Boolean(
    initialData?.strategyId || initialData?.entryCommentId || initialData?.exitCommentId ||
    initialData?.managementCommentId || initialData?.exitPlan || initialData?.stopLoss != null ||
    initialData?.takeProfit != null || (initialData?.attachment && initialData.attachment.length > 0)
  );
  const [showAdvanced, setShowAdvanced] = useState(hasAdvancedData);

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

  // Live discipline (Tiltmeter-style): reacts to entry/exit/management comment
  // ratings as the user selects them. Null until at least one rated comment is set.
  const liveDiscipline = React.useMemo(
    () => computeTradeDiscipline({ entryCommentId, exitCommentId, managementCommentId } as JournalData, tradeComments),
    [entryCommentId, exitCommentId, managementCommentId, tradeComments],
  );

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
        <p className="text-xs mb-1.5">{label}</p>
        <Select
          aria-label={label}
          placeholder="Select..."
          selectedKeys={value ? [value] : []}
          onSelectionChange={(keys) => {
            const v = Array.from(keys)[0];
            onChange(v && v !== '__clear' ? String(v) : null);
          }}
        >
          <>
            <SelectItem key="__clear" className="text-muted-foreground">
              None
            </SelectItem>
            {comments.map((c) => (
              <SelectItem key={c.id} textValue={c.label}>
                <span className="flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${ratingDot(c.rating)}`} />
                  {c.label}
                </span>
              </SelectItem>
            ))}
          </>
        </Select>
      </div>
    );
  }

  return (
    <Modal
      isOpen
      onOpenChange={(open) => { if (!open) handleClose() }}
      size="2xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="text-base flex items-center gap-2">
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
            {currentIndex != null && totalCount != null && totalCount > 1 && (
              <span className="text-xs font-normal text-muted-foreground ml-auto">
                {currentIndex} of {totalCount}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground font-normal pt-1">
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
        </ModalHeader>

        <ModalBody className="px-0">
        <Tabs
          aria-label="Trade journal tabs"
          defaultSelectedKey="journal"
          fullWidth
          classNames={{ panel: 'px-6' }}
        >
          <Tab key="journal" title="Journal">
          <div className="space-y-6 pt-4">
          {/* Live discipline meter (Tiltmeter) — only when comments are configured */}
          {tradeComments.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <DisciplineMeter percentage={liveDiscipline?.percentage ?? null} compact />
            </div>
          )}
          {/* Buy Section */}
          <section>
            <h4 className="text-sm font-medium mb-3">Journal the Buy</h4>

            <div className="space-y-4">
              {showAdvanced && (
              <div>
                <p className="text-xs mb-1.5">
                  Strategy
                </p>
                <Select
                  aria-label="Strategy"
                  placeholder="Select a strategy..."
                  selectedKeys={strategyId ? [strategyId] : []}
                  onSelectionChange={(keys) => {
                    const v = Array.from(keys)[0];
                    if (v) handleStrategyChange(String(v));
                  }}
                >
                  <>
                    {activeStrategies.map((s) => (
                      <SelectItem key={s.id} textValue={s.name}>
                        <span className="flex items-center gap-1.5">
                          <span>{s.icon}</span>
                          <span>{s.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                    <SelectItem key="__add_new" className="text-muted-foreground">
                      + Manage strategies &#x2197;
                    </SelectItem>
                  </>
                </Select>
              </div>
              )}

              {/* Strategy Rule Checklist */}

              {/* Emotion Tag Grid */}
              <div>
                <p className="text-xs mb-1.5">Emotion Tag</p>
                <div className="grid grid-cols-4 gap-1.5 mt-1">
                  {emotionTags.map((tag) => (
                    <Button
                      key={tag.id}
                      size="sm"
                      variant={emotionTag === tag.id ? 'solid' : 'bordered'}
                      color={emotionTag === tag.id ? 'primary' : 'default'}
                      onPress={() => setEmotionTag(emotionTag === tag.id ? null : tag.id)}
                      className="justify-start gap-1.5 text-xs"
                    >
                      <span>{tag.emoji}</span>
                      <span>{tag.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Entry Comment */}
              {showAdvanced && entryComments.length > 0 && renderCommentSelect(
                'Entry Comment',
                entryComments,
                entryCommentId,
                setEntryCommentId
              )}


              <RatingScale
                value={buyRating}
                onChange={setBuyRating}
                size="sm"
                label="Rate the entry execution"
              />

              {showAdvanced && (<>
              <div>
                <Textarea
                  label="Your exit plan"
                  labelPlacement="outside"
                  value={exitPlan}
                  onValueChange={setExitPlan}
                  placeholder="What's your target? When will you sell?"
                  minRows={3}
                />
              </div>

              {/* Stop Loss and Take Profit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input
                    label="Stop Loss (MC)"
                    labelPlacement="outside"
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={stopLoss != null ? String(stopLoss) : ''}
                    onChange={(e) => setStopLoss(e.target.value === '' ? null : parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <Input
                    label="Take Profit (MC)"
                    labelPlacement="outside"
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={takeProfit != null ? String(takeProfit) : ''}
                    onChange={(e) => setTakeProfit(e.target.value === '' ? null : parseFloat(e.target.value))}
                  />
                </div>
              </div>
              </>)}
            </div>
          </section>

          <Divider />

          {/* Sell Section */}
          <section>
            <h4 className="text-sm font-medium mb-3">Sell Analysis</h4>

            <div className="space-y-4">
              {/* Rating */}
              <RatingScale
                value={sellRating}
                onChange={setSellRating}
                size="sm"
                label="Rate the exit"
              />

              {/* Exit Comment */}
              {showAdvanced && exitComments.length > 0 && renderCommentSelect(
                'Exit Comment',
                exitComments,
                exitCommentId,
                setExitCommentId
              )}

              {/* Followed Exit Rule */}
              <div>
                <p className="text-xs mb-1.5">Did you follow your exit rule?</p>
                <div className="mt-1">
                  <YesNoToggle
                    value={followedExitRule}
                    onChange={setFollowedExitRule}
                  />
                </div>
              </div>

              {/* Mistakes */}
              <div>
                <p className="text-xs mb-1.5">Mistakes</p>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  {mistakeOptions.map((mistake) => (
                    <Button
                      key={mistake}
                      size="sm"
                      variant={sellMistakes.includes(mistake) ? 'solid' : 'bordered'}
                      color={sellMistakes.includes(mistake) ? 'primary' : 'default'}
                      onPress={() => toggleMistake(mistake)}
                      className="justify-start text-xs"
                    >
                      {mistake}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Management Comment */}
              {showAdvanced && managementComments.length > 0 && renderCommentSelect(
                'Management Comment',
                managementComments,
                managementCommentId,
                setManagementCommentId
              )}

            </div>
          </section>



          {showAdvanced && (<>
          <Divider />

          {/* Attachments */}
          <section>
            <h4 className="text-sm font-medium mb-1">Attachments</h4>
            <p className="text-xs text-muted-foreground mb-3">Add chart screenshots or trade setup images for review</p>

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
                      isIconOnly
                      color="danger"
                      size="sm"
                      className="absolute top-1 right-1 h-5 w-5 min-w-5 p-0 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                      onPress={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      &times;
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <input
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
          </>)}

          {/* Quick/full mode toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 py-1"
          >
            {showAdvanced ? 'Hide advanced options' : 'Show advanced options (strategy, rules, comments, exit plan, SL/TP, attachments)'}
          </button>
          </div>
          </Tab>

          <Tab key="edit" title="Edit Trade">
            <div className="pt-4">
              <EditTradeTab trade={trade} />
            </div>
          </Tab>
        </Tabs>
        </ModalBody>

        <ModalFooter className="pt-4">
          <Button variant="bordered" size="sm" onPress={handleClose}>
            Cancel
          </Button>
          {onSaveAndNext && (
            <Button variant="bordered" size="sm" isDisabled={saving} onPress={async () => {
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
          <Button color="primary" size="sm" isDisabled={saving} onPress={handleSave}>
            {saving ? 'Saving...' : 'Save Journal'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
});

export default JournalModal;

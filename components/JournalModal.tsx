'use client';

import React, { useState, useCallback, memo } from 'react';
import { FlattenedTrade } from '@/lib/tradeCycles';
import { formatDuration, formatTime, formatValue, formatMarketCap } from '@/lib/formatters';
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

export interface JournalData {
  buyCategory: string;
  buyNotes: string;
  buyRating: number;
  fomoLevel: number;
  energyLevel: number;
  exitPlan: string;
  sellRating: number;
  followedExitRule: boolean | null;
  sellMistakes: string[];
  sellNotes: string;
  attachment?: string;
}

interface JournalModalProps {
  trade: FlattenedTrade;
  initialData: JournalData | null;
  tokenLogo?: string | null;
  onSave: (data: JournalData) => void;
  onClose: () => void;
}

const buyCategories = [
  'Trend Following',
  'Breakout',
  'Dip Buy',
  'News/Event',
  'Technical Setup',
  'Fundamental Analysis',
  'FOMO',
  'Other',
];

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

const JournalModal = memo(function JournalModal({
  trade,
  initialData,
  tokenLogo,
  onSave,
  onClose,
}: JournalModalProps) {
  const [buyCategory, setBuyCategory] = useState(initialData?.buyCategory || '');
  const [buyNotes, setBuyNotes] = useState(initialData?.buyNotes || '');
  const [buyRating, setBuyRating] = useState(initialData?.buyRating || 0);
  const [fomoLevel, setFomoLevel] = useState(initialData?.fomoLevel || 0);
  const [energyLevel, setEnergyLevel] = useState(initialData?.energyLevel || 0);
  const [exitPlan, setExitPlan] = useState(initialData?.exitPlan || '');
  const [sellRating, setSellRating] = useState(initialData?.sellRating || 0);
  const [followedExitRule, setFollowedExitRule] = useState<boolean | null>(initialData?.followedExitRule ?? null);
  const [sellMistakes, setSellMistakes] = useState<string[]>(initialData?.sellMistakes || []);
  const [sellNotes, setSellNotes] = useState(initialData?.sellNotes || '');
  const [attachment, setAttachment] = useState<string | undefined>(initialData?.attachment);

  const handleSave = useCallback(() => {
    onSave({
      buyCategory,
      buyNotes,
      buyRating,
      fomoLevel,
      energyLevel,
      exitPlan,
      sellRating,
      followedExitRule,
      sellMistakes,
      sellNotes,
      attachment,
    });
  }, [buyCategory, buyNotes, buyRating, fomoLevel, energyLevel, exitPlan, sellRating, followedExitRule, sellMistakes, sellNotes, attachment, onSave]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachment(reader.result as string);
      };
      reader.onerror = () => {
        alert('Failed to read image file');
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const toggleMistake = useCallback((mistake: string) => {
    setSellMistakes((prev) =>
      prev.includes(mistake) ? prev.filter((m) => m !== mistake) : [...prev, mistake]
    );
  }, []);

  const avgBuyPrice = trade.totalBuyAmount > 0 ? trade.totalBuyValue / trade.totalBuyAmount : 0;
  const avgSellPrice = trade.totalSellAmount > 0 ? trade.totalSellValue / trade.totalSellAmount : 0;

  return (
    <Dialog open onOpenChange={() => onClose()}>
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

        <div className="overflow-y-auto flex-1 -mx-6 px-6 space-y-6">
          {/* Buy Section */}
          <section>
            <h4 className="text-sm font-medium mb-3">Journal the Buy</h4>

            <div className="space-y-4">
              <div>
                <Label htmlFor="buy-category" className="text-xs mb-1.5">
                  Category
                </Label>
                <Select value={buyCategory} onValueChange={setBuyCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {buyCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="buy-notes" className="text-xs mb-1.5">
                  Notes
                </Label>
                <Textarea
                  id="buy-notes"
                  value={buyNotes}
                  onChange={(e) => setBuyNotes(e.target.value)}
                  placeholder="Why did you enter this trade? What was your thesis?"
                  rows={3}
                />
              </div>

              <div>
                <Label className="text-xs mb-1.5">Rate the entry</Label>
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
                <Label className="text-xs mb-1.5">FOMO Level</Label>
                <p className="text-[10px] text-muted-foreground mb-1">1 = No FOMO · 10 = Pure FOMO</p>
                <div className="flex gap-0.5" role="group" aria-label="FOMO level">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setFomoLevel(n)}
                      className={`w-7 h-7 text-sm rounded transition-colors ${
                        n <= fomoLevel
                          ? 'bg-amber-500 text-white'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                      aria-label={`FOMO level ${n} out of 10`}
                    >
                      {n}
                    </button>
                  ))}
                  {fomoLevel > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground self-center font-mono tabular-nums">
                      {fomoLevel}/10
                    </span>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-xs mb-1.5">Energy Level</Label>
                <p className="text-[10px] text-muted-foreground mb-1">1-2 Tapped Out · 3-4 Fatigued · 5-7 Partial · 8-10 Fully Charged</p>
                <div className="flex gap-0.5" role="group" aria-label="Energy level">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
                    let activeColor = 'bg-red-500 text-white';
                    if (energyLevel >= 3 && energyLevel <= 4) activeColor = 'bg-orange-500 text-white';
                    else if (energyLevel >= 5 && energyLevel <= 7) activeColor = 'bg-yellow-500 text-white';
                    else if (energyLevel >= 8) activeColor = 'bg-emerald-500 text-white';
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setEnergyLevel(n)}
                        className={`w-7 h-7 text-sm rounded transition-colors ${
                          n <= energyLevel
                            ? activeColor
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                        aria-label={`Energy level ${n} out of 10`}
                      >
                        {n}
                      </button>
                    );
                  })}
                  {energyLevel > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground self-center font-mono tabular-nums">
                      {energyLevel}/10
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
                  placeholder="What's your target? When will you sell? What's your stop loss?"
                  rows={3}
                />
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

              {/* Followed Exit Rule */}
              <div>
                <Label className="text-xs mb-1.5">Did you follow your exit rule?</Label>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setFollowedExitRule(true)}
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
                    onClick={() => setFollowedExitRule(false)}
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

              {/* Sell Notes */}
              <div>
                <Label htmlFor="sell-notes" className="text-xs mb-1.5">
                  Additional Notes
                </Label>
                <Textarea
                  id="sell-notes"
                  value={sellNotes}
                  onChange={(e) => setSellNotes(e.target.value)}
                  placeholder="What did you learn? What would you do differently?"
                  rows={3}
                />
              </div>
            </div>
          </section>

          <Separator />

          {/* Attachment */}
          <section>
            <h4 className="text-sm font-medium mb-3">Attachment</h4>

            {!attachment ? (
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
                  className="flex items-center justify-center w-full px-4 py-6 border border-dashed border-border rounded-md cursor-pointer hover:border-primary hover:bg-muted/30 transition-colors"
                >
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Click to upload image</p>
                    <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, GIF up to 5MB</p>
                  </div>
                </label>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={attachment}
                  alt="Trade attachment"
                  className="w-full rounded-md border border-border"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => setAttachment(undefined)}
                >
                  Remove
                </Button>
              </div>
            )}
          </section>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save Journal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default JournalModal;

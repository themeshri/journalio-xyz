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
  sellRating: number;
  sellMistakes: string[];
  sellNotes: string;
  attachment?: string;
}

interface JournalModalProps {
  trade: FlattenedTrade;
  initialData: JournalData | null;
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
  onSave,
  onClose,
}: JournalModalProps) {
  const [buyCategory, setBuyCategory] = useState(initialData?.buyCategory || '');
  const [buyNotes, setBuyNotes] = useState(initialData?.buyNotes || '');
  const [sellRating, setSellRating] = useState(initialData?.sellRating || 0);
  const [sellMistakes, setSellMistakes] = useState<string[]>(initialData?.sellMistakes || []);
  const [sellNotes, setSellNotes] = useState(initialData?.sellNotes || '');
  const [attachment, setAttachment] = useState<string | undefined>(initialData?.attachment);

  const handleSave = useCallback(() => {
    onSave({
      buyCategory,
      buyNotes,
      sellRating,
      sellMistakes,
      sellNotes,
      attachment,
    });
  }, [buyCategory, buyNotes, sellRating, sellMistakes, sellNotes, attachment, onSave]);

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
          <DialogTitle className="text-base">{trade.token} - Trade Journal</DialogTitle>
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
            </div>
          </section>

          <Separator />

          {/* Sell Section */}
          <section>
            <h4 className="text-sm font-medium mb-3">Sell Analysis</h4>

            <div className="space-y-4">
              {/* Rating */}
              <div>
                <Label className="text-xs mb-1.5">Rate this trade</Label>
                <div className="flex gap-0.5 mt-1" role="group" aria-label="Trade rating">
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

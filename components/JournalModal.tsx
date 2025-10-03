'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { FlattenedTrade } from '@/lib/tradeCycles';
import { formatDuration, formatTime, formatValue, formatMarketCap } from '@/lib/formatters';

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

  const removeAttachment = useCallback(() => {
    setAttachment(undefined);
  }, []);

  const toggleMistake = useCallback((mistake: string) => {
    setSellMistakes((prev) =>
      prev.includes(mistake) ? prev.filter((m) => m !== mistake) : [...prev, mistake]
    );
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    // Prevent body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose]);

  // Focus trap
  useEffect(() => {
    const modalElement = document.getElementById('journal-modal');
    if (modalElement) {
      const focusableElements = modalElement.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleTab = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      };

      document.addEventListener('keydown', handleTab);
      firstElement?.focus();

      return () => {
        document.removeEventListener('keydown', handleTab);
      };
    }
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="journal-modal-title"
    >
      <div
        id="journal-modal"
        className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div>
            <h3 id="journal-modal-title" className="text-2xl font-bold text-gray-900">
              {trade.token} - Trade Journal
            </h3>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <span>Start: {formatTime(trade.startDate)}</span>
                {trade.endDate && (
                  <>
                    <span aria-hidden="true">•</span>
                    <span>End: {formatTime(trade.endDate)}</span>
                  </>
                )}
                {trade.duration && (
                  <>
                    <span aria-hidden="true">•</span>
                    <span>Duration: {formatDuration(trade.duration)}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-green-600 font-medium">
                  Buy MC:{' '}
                  {formatMarketCap(
                    (trade.totalBuyAmount > 0 ? trade.totalBuyValue / trade.totalBuyAmount : 0) * 1_000_000_000
                  )}
                </span>
                {trade.totalSellAmount > 0 && (
                  <>
                    <span className="text-gray-400" aria-hidden="true">
                      •
                    </span>
                    <span className="text-red-600 font-medium">
                      Sell MC: {formatMarketCap((trade.totalSellValue / trade.totalSellAmount) * 1_000_000_000)}
                    </span>
                  </>
                )}
                <span className="text-gray-400" aria-hidden="true">
                  •
                </span>
                <span className={`font-bold ${trade.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  P/L: {trade.profitLoss >= 0 ? '+' : ''}
                  {formatValue(trade.profitLoss)}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            aria-label="Close journal modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Journal the Buy Section */}
          <div className="mb-8">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Journal the Buy</h4>

            <div className="mb-4">
              <label htmlFor="buy-category" className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                id="buy-category"
                value={buyCategory}
                onChange={(e) => setBuyCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-required="false"
              >
                <option value="">Select a category...</option>
                {buyCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="buy-notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                id="buy-notes"
                value={buyNotes}
                onChange={(e) => setBuyNotes(e.target.value)}
                placeholder="Why did you enter this trade? What was your thesis?"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                aria-label="Buy notes"
              />
            </div>
          </div>

          {/* Sell Section */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Sell Analysis</h4>

            {/* Star Rating */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Rate this trade</label>
              <div className="flex gap-1" role="group" aria-label="Trade rating">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                  <button
                    key={star}
                    onClick={() => setSellRating(star)}
                    className={`text-2xl transition-colors ${
                      star <= sellRating ? 'text-yellow-400' : 'text-gray-300'
                    } hover:text-yellow-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded`}
                    aria-label={`Rate ${star} out of 10`}
                    aria-pressed={star <= sellRating}
                  >
                    ★
                  </button>
                ))}
                {sellRating > 0 && (
                  <span className="ml-2 text-sm text-gray-600 self-center" aria-live="polite">
                    {sellRating}/10
                  </span>
                )}
              </div>
            </div>

            {/* Mistakes */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Mistakes (select all that apply)</label>
              <div
                className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3"
                role="group"
                aria-label="Trading mistakes"
              >
                {mistakeOptions.map((mistake) => (
                  <label
                    key={mistake}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={sellMistakes.includes(mistake)}
                      onChange={() => toggleMistake(mistake)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      aria-label={mistake}
                    />
                    <span className="text-sm text-gray-700">{mistake}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sell Notes */}
            <div>
              <label htmlFor="sell-notes" className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                id="sell-notes"
                value={sellNotes}
                onChange={(e) => setSellNotes(e.target.value)}
                placeholder="What did you learn? What would you do differently?"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                aria-label="Sell notes"
              />
            </div>
          </div>

          {/* Attachment Section */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Attachment</h4>

            {!attachment ? (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                  aria-label="Upload trade image"
                />
                <label
                  htmlFor="image-upload"
                  className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      document.getElementById('image-upload')?.click();
                    }
                  }}
                >
                  <div className="text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="mt-2 text-sm text-gray-600">Click to upload image</p>
                    <p className="mt-1 text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                  </div>
                </label>
              </div>
            ) : (
              <div className="relative">
                <img src={attachment} alt="Trade attachment" className="w-full rounded-lg border border-gray-200" />
                <button
                  onClick={removeAttachment}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                  aria-label="Remove image"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
            aria-label="Cancel journal"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Save journal"
          >
            Save Journal
          </button>
        </div>
      </div>
    </div>
  );
});

export default JournalModal;

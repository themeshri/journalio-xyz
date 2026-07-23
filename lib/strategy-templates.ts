// Built-in strategy templates — Journalio-authored, Solana-native playbooks.
//
// These were previously a local `TEMPLATES` const inside the strategies page.
// They live here so scripts/seed-strategy-templates.ts can write them to the DB
// as `Strategy` rows with `isTemplate: true`, per Phase A6 of the TradeZella
// refactor. The page reads templates from /api/strategies?templates=true.
//
// NOTE (docs/TRADEZELLA-JOURNAL-ANALYSIS.md §6): these are our own playbooks.
// Do not add TradeZella's authored templates — those carry the authors' rights.

import type { RuleGroup } from './strategies'

export interface StrategyTemplate {
  name: string
  description: string
  icon: string
  color: string
  ruleGroups: Omit<RuleGroup, 'id'>[]
}

export const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    name: 'Solana Momentum',
    description: 'High-volume meme plays with strong social buzz',
    icon: '🚀',
    color: '#10b981',
    ruleGroups: [
      {
        name: 'Entry Criteria',
        sortOrder: 0,
        rules: [
          { id: '', text: 'Token has strong social buzz (CT/Telegram mentions)', isRequired: true, showWhen: 'always', sortOrder: 0 },
          { id: '', text: 'Volume spike detected (>2x normal)', isRequired: true, showWhen: 'always', sortOrder: 1 },
          { id: '', text: 'Market cap in my target range', isRequired: true, showWhen: 'always', sortOrder: 2 },
          { id: '', text: 'Not a copy/fork of an existing token', isRequired: false, showWhen: 'always', sortOrder: 3 },
        ],
      },
      {
        name: 'Exit Criteria',
        sortOrder: 1,
        rules: [
          { id: '', text: 'Hit take-profit target (2x-5x)', isRequired: true, showWhen: 'always', sortOrder: 0 },
          { id: '', text: 'Volume dying / momentum fading', isRequired: true, showWhen: 'always', sortOrder: 1 },
          { id: '', text: 'Dev wallet dumping / insider selling', isRequired: true, showWhen: 'always', sortOrder: 2 },
        ],
      },
      {
        name: 'Risk Parameters',
        sortOrder: 2,
        rules: [
          { id: '', text: 'Position size within my limits', isRequired: true, showWhen: 'always', sortOrder: 0 },
          { id: '', text: 'Not already overexposed to this narrative', isRequired: true, showWhen: 'always', sortOrder: 1 },
          { id: '', text: 'Stop loss plan defined before entry', isRequired: true, showWhen: 'always', sortOrder: 2 },
        ],
      },
      {
        name: 'Market Conditions',
        sortOrder: 3,
        rules: [
          { id: '', text: 'SOL trending up or stable', isRequired: false, showWhen: 'always', sortOrder: 0 },
          { id: '', text: 'No major FUD events ongoing', isRequired: false, showWhen: 'always', sortOrder: 1 },
          { id: '', text: 'Not trading during low-liquidity hours', isRequired: false, showWhen: 'always', sortOrder: 2 },
        ],
      },
    ],
  },
  {
    name: 'Sniper Entry',
    description: 'Fresh deployments with quick scalp targets',
    icon: '🎯',
    color: '#f59e0b',
    ruleGroups: [
      {
        name: 'Entry Criteria',
        sortOrder: 0,
        rules: [
          { id: '', text: 'Fresh deployment (< 1 hour old)', isRequired: true, showWhen: 'always', sortOrder: 0 },
          { id: '', text: 'Liquidity locked or burned', isRequired: true, showWhen: 'always', sortOrder: 1 },
          { id: '', text: 'Contract verified / no honeypot flags', isRequired: true, showWhen: 'always', sortOrder: 2 },
          { id: '', text: 'Social accounts created (Twitter/Telegram)', isRequired: false, showWhen: 'always', sortOrder: 3 },
        ],
      },
      {
        name: 'Exit Criteria',
        sortOrder: 1,
        rules: [
          { id: '', text: 'Quick 2-3x scalp target', isRequired: true, showWhen: 'always', sortOrder: 0 },
          { id: '', text: 'Exit if no movement in 15 min', isRequired: true, showWhen: 'always', sortOrder: 1 },
        ],
      },
      {
        name: 'Risk Parameters',
        sortOrder: 2,
        rules: [
          { id: '', text: 'Max loss: predetermined amount', isRequired: true, showWhen: 'always', sortOrder: 0 },
          { id: '', text: 'Small position (1-2% of portfolio)', isRequired: true, showWhen: 'always', sortOrder: 1 },
        ],
      },
    ],
  },
  {
    name: 'Swing / Narrative Play',
    description: 'Catalyst-driven trades held for 1-7 days',
    icon: '📊',
    color: '#8b5cf6',
    ruleGroups: [
      {
        name: 'Entry Criteria',
        sortOrder: 0,
        rules: [
          { id: '', text: 'Clear narrative/catalyst identified', isRequired: true, showWhen: 'always', sortOrder: 0 },
          { id: '', text: 'Token survived initial pump/dump cycle', isRequired: true, showWhen: 'always', sortOrder: 1 },
          { id: '', text: 'Building higher lows on chart', isRequired: true, showWhen: 'always', sortOrder: 2 },
          { id: '', text: 'Community active and growing', isRequired: false, showWhen: 'always', sortOrder: 3 },
        ],
      },
      {
        name: 'Exit Criteria',
        sortOrder: 1,
        rules: [
          { id: '', text: 'Narrative plays out / catalyst happens', isRequired: true, showWhen: 'always', sortOrder: 0 },
          { id: '', text: 'Scale out in chunks (25% at each target)', isRequired: true, showWhen: 'always', sortOrder: 1 },
        ],
      },
      {
        name: 'Risk Parameters',
        sortOrder: 2,
        rules: [
          { id: '', text: 'Comfortable holding for 1-7 days', isRequired: true, showWhen: 'always', sortOrder: 0 },
          { id: '', text: 'Position size accounts for volatility', isRequired: true, showWhen: 'always', sortOrder: 1 },
        ],
      },
    ],
  },
]
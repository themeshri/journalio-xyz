# Solana Wallet Tracker - User Flow Documentation

## Primary User Flows

### 1. New User Onboarding Flow

```
┌─────────────────┐
│ User visits app │
│ (/)             │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ No session?     │
│ Redirect to     │
│ /auth/signin    │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Sign In Page    │
│ - Email input   │
│ - Submit button │
└─────────┬───────┘
          │
          ▼ (Enter email)
┌─────────────────┐
│ POST /api/auth/ │
│ callback/       │
│ credentials     │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Find/Create     │
│ User in DB      │
│ + UserSettings  │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Create JWT      │
│ Session &       │
│ Set Cookie      │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Redirect to     │
│ Main App (/)    │
│ Authenticated   │
└─────────────────┘
```

**Key States**:
- **Unauthenticated**: Shows sign-in form
- **Loading**: Processing authentication
- **Authenticated**: Access to main application

**User Actions**:
1. Enter email address
2. Click "Sign In"
3. Wait for authentication
4. Access main application

**System Actions**:
1. Validate email format
2. Find or create user record
3. Create default UserSettings
4. Generate JWT session
5. Set secure cookie
6. Redirect to main app

---

### 2. Wallet Search & Analysis Flow

```
┌─────────────────┐
│ Main App Page   │
│ - Search bar    │
│ - Empty state   │
└─────────┬───────┘
          │
          ▼ (Enter wallet address)
┌─────────────────┐
│ Validate        │
│ Solana Address  │
│ Format          │
└─────────┬───────┘
          │ ✓ Valid
          ▼
┌─────────────────┐
│ Check Cache     │
│ (Trade table)   │
│ Age < 5 min?    │
└─────────┬───────┘
          │
          ├─ Yes ──► Return Cached Data
          │
          ▼ No/Force Refresh
┌─────────────────┐
│ Call Solana     │
│ Tracker API     │
│ Get Trades      │
└─────────┬───────┘
          │
          ▼ Success
┌─────────────────┐
│ Upsert Trades   │
│ to Database     │
│ by Signature    │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Auto-add Wallet │
│ to User's List  │
│ (if new)        │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Display Results │
│ - Transaction   │
│   List          │
│ - Summary View  │
│ - Cache Info    │
└─────────────────┘
```

**Error Handling Flow**:
```
API Call Fails
     │
     ▼
Check for Cached Data
     │
     ├─ Has Cache ──► Return Stale Data + Warning
     │
     ▼ No Cache
Show Error Message + Retry Option
```

**User Actions**:
1. Enter wallet address in search bar
2. Click search or press Enter
3. Optionally click "🔄 Refresh" for fresh data
4. Review transaction list and summary

**System Actions**:
1. Validate wallet address format
2. Check database cache age
3. Fetch from API if needed
4. Store/update transactions
5. Auto-add wallet to user's list
6. Display formatted results

---

### 3. Trade Cycle Analysis Flow

```
┌─────────────────┐
│ Transaction     │
│ Data Loaded     │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Group Trades    │
│ by Token        │
│ Address         │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ For Each Token: │
│ - Separate      │
│   Buy/Sell      │
│ - Calculate P/L │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Check Current   │
│ Wallet Balance  │
│ for Open Trades │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Display Cycles: │
│ - Completed     │
│ - Incomplete    │
│ - P/L Summary   │
└─────────────────┘
```

**Trade Cycle Logic**:
```
1. Group all trades by token address
2. Sort by timestamp (oldest first)
3. For each token:
   - Track running balance
   - When balance reaches 0 = complete cycle
   - Calculate P/L for complete cycle
   - Show current position for incomplete
```

**User Actions**:
1. Switch to "Summary" view
2. Review trade cycles for each token
3. See P/L calculations
4. Identify current open positions

**System Actions**:
1. Parse transaction data
2. Group by token
3. Calculate running balances
4. Determine cycle completion
5. Fetch current balances for open positions
6. Format and display results

---

### 4. Trade Editing Flow

```
┌─────────────────┐
│ Transaction     │
│ List View       │
└─────────┬───────┘
          │
          ▼ (Click "Edit" on trade)
┌─────────────────┐
│ Edit Modal      │
│ - Trade type    │
│ - Amounts       │
│ - USD value     │
│ - Notes field   │
└─────────┬───────┘
          │
          ▼ (Save changes)
┌─────────────────┐
│ Validate Input  │
│ - Positive nums │
│ - Valid type    │
└─────────┬───────┘
          │ ✓ Valid
          ▼
┌─────────────────┐
│ POST /api/      │
│ trade-edits     │
│ (Upsert)        │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Update UI       │
│ - Show edited   │
│   values        │
│ - Recalculate   │
│   cycles        │
└─────────────────┘
```

**Edit States**:
- **View Mode**: Show original + edited values
- **Edit Mode**: Form with current values
- **Saving**: Loading indicator
- **Saved**: Success feedback + updated display

**User Actions**:
1. Click "Edit" button on any trade
2. Modify values in modal form
3. Add optional notes for context
4. Save changes or cancel

**System Actions**:
1. Load existing edit data (if any)
2. Validate form inputs
3. Save to TradeEdit table
4. Merge edited data with original
5. Recalculate trade cycles
6. Update UI display

---

### 5. Missed Opportunity (Papered Play) Flow

```
┌─────────────────┐
│ Navigate to     │
│ Papered Plays   │
│ Section         │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Load User's     │
│ Papered Plays   │
│ from Database   │
└─────────┬───────┘
          │
          ├─ Empty ──► Show "Add First Play" CTA
          │
          ▼ Has Data
┌─────────────────┐
│ Display List:   │
│ - Coin name     │
│ - MC when saw   │
│ - ATH reached   │
│ - Potential %   │
│ - Date added    │
└─────────┬───────┘
          │
          ▼ (Click "Add New")
┌─────────────────┐
│ Add Play Form:  │
│ - Coin name     │
│ - MC when saw   │
│ - ATH reached   │
│ - Reason missed │
└─────────┬───────┘
          │
          ▼ (Submit)
┌─────────────────┐
│ Validate &      │
│ Save to DB      │
│ Calculate Gain  │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Update List     │
│ Show Success    │
│ Feedback        │
└─────────────────┘
```

**Calculation Logic**:
```
// Example:
MC When Saw: "$500K"
ATH: "$50M"
Potential Gain: 100x (5000%)

// Formula:
parseMarketCap(ath) / parseMarketCap(mcWhenSaw) = multiplier
```

**User Actions**:
1. Click "Papered Plays" in navigation
2. View list of missed opportunities
3. Click "Add New" to record new missed play
4. Fill out form with coin details
5. Submit and see calculated potential gain

**System Actions**:
1. Fetch user's papered plays
2. Sort by date (newest first)
3. Parse market cap strings
4. Calculate potential gain multipliers
5. Save new entries to database
6. Update list display

---

### 6. Settings Management Flow

```
┌─────────────────┐
│ Navigate to     │
│ Settings Page   │
│ (/settings)     │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Load User       │
│ Settings from   │
│ Database        │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Display Form:   │
│ - Display name  │
│ - Email (RO)    │
│ - TX limit      │
│ - Show USD      │
└─────────┬───────┘
          │
          ▼ (Modify values)
┌─────────────────┐
│ Enable Save     │
│ Button          │
│ (Change detect) │
└─────────┬───────┘
          │
          ▼ (Click Save)
┌─────────────────┐
│ Validate Input  │
│ - TX limit enum │
│ - Name length   │
└─────────┬───────┘
          │ ✓ Valid
          ▼
┌─────────────────┐
│ PATCH /api/     │
│ settings        │
│ Update DB       │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Show Success    │
│ Feedback        │
│ Update UI       │
└─────────────────┘
```

**Setting Options**:
- **Display Name**: Text input (max 50 chars)
- **Email**: Read-only (from auth)
- **Transaction Limit**: Dropdown (25/50/100/200)
- **Show USD Values**: Toggle switch

**User Actions**:
1. Navigate to Settings page
2. Modify preferences in form
3. Click "Save Changes"
4. See success confirmation

**System Actions**:
1. Load current user settings
2. Detect form changes
3. Validate input values
4. Update database record
5. Show success feedback

---

### 7. Wallet Management Flow

```
┌─────────────────┐
│ Settings Page   │
│ Wallet Section  │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Load User's     │
│ Saved Wallets   │
│ with Trade      │
│ Counts          │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Display List:   │
│ - Address       │
│ - Nickname      │
│ - Trade count   │
│ - Default star  │
│ - Actions       │
└─────────┬───────┘
          │
          ▼ (User actions)
          │
          ├─ Edit Nickname ──┐
          │                  │
          ├─ Set Default ────┤
          │                  │
          ├─ Delete Wallet ──┤
          │                  │
          └─ Add Manual ─────┘
                             │
                             ▼
┌─────────────────┐
│ Execute Action  │
│ Update Database │
│ Refresh List    │
└─────────────────┘
```

**Wallet States**:
- **Default**: Starred, loads first on app open
- **Normal**: Saved for quick access
- **Auto-added**: Added when searched

**User Actions**:
1. View saved wallets in settings
2. Edit nicknames for easy identification
3. Set one wallet as default
4. Delete unwanted wallets
5. Manually add new wallets

**System Actions**:
1. Load user's wallets with trade counts
2. Execute CRUD operations
3. Ensure only one default wallet
4. Update UI immediately
5. Cascade delete trades if wallet deleted

---

## Secondary User Flows

### Error Handling Flows

#### API Failure Flow
```
API Call Fails
     │
     ▼
Check Cache Age
     │
     ├─ Recent ──► Return Cached + "Stale" Warning
     │
     ▼ Old/None
Show Error Message
     │
     ▼
Offer Actions:
- Retry API Call
- Use Last Known Data
- Try Different Wallet
```

#### Authentication Error Flow
```
Session Expired/Invalid
     │
     ▼
Clear Local Storage
     │
     ▼
Redirect to /auth/signin
     │
     ▼
Show Message: "Session expired, please sign in"
     │
     ▼
User Signs In
     │
     ▼
Redirect to Original Page
```

#### Validation Error Flow
```
Invalid Input Submitted
     │
     ▼
Show Field-Specific Errors
     │
     ├─ Invalid wallet address
     ├─ Required field missing  
     ├─ Number out of range
     └─ Invalid format
     │
     ▼
Keep Form Data
Highlight Error Fields
Focus First Error
```

### Mobile User Flow Adaptations

#### Mobile Search Flow
```
┌─────────────────┐
│ Mobile Layout   │
│ - Collapsed nav │
│ - Touch-opt UI  │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Full-width      │
│ Search Bar      │
│ Large touch     │
│ targets         │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Modal Trade     │
│ Details         │
│ (vs sidebar)    │
└─────────────────┘
```

#### Mobile Navigation Flow
```
Hamburger Menu
     │
     ▼
Slide-out Navigation:
- Home
- Papered Plays  
- Settings
- Sign Out
     │
     ▼
Auto-close on Selection
```

### Performance Optimization Flows

#### Progressive Loading Flow
```
Page Load
     │
     ▼
Load Skeleton UI
     │
     ▼
Load Critical Data (User, Settings)
     │
     ▼
Load Cached Trade Data
     │
     ▼
Load Fresh Data (Background)
     │
     ▼
Update UI if New Data Available
```

## Flow State Diagrams

### Application State Flow
```
┌─────────────┐
│ LOADING     │ ──► Initial app load
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ SIGNED_OUT  │ ──► Show sign-in form
└──────┬──────┘
       │ (Authenticate)
       ▼
┌─────────────┐
│ SIGNED_IN   │ ──► Main app functionality
└──────┬──────┘
       │ (Sign out / Session expire)
       ▼
┌─────────────┐
│ SIGNED_OUT  │
└─────────────┘
```

### Data Loading State Flow
```
┌─────────────┐
│ IDLE        │ ──► No wallet selected
└──────┬──────┘
       │ (Search wallet)
       ▼
┌─────────────┐
│ LOADING     │ ──► Fetching data
└──────┬──────┘
       │
       ├─ Success ──► ┌─────────────┐
       │              │ LOADED      │ ──► Display results
       │              └─────────────┘
       │
       └─ Error ────► ┌─────────────┐
                      │ ERROR       │ ──► Show error message
                      └─────────────┘
```

### Cache State Flow
```
Request Data
     │
     ▼
┌─────────────┐
│ CHECK_CACHE │
└──────┬──────┘
       │
       ├─ Fresh ────► Return Cached
       │
       ├─ Stale ────► ┌─────────────┐
       │              │ REFRESHING  │ ──► Call API
       │              └─────────────┘
       │
       └─ Empty ────► ┌─────────────┐
                      │ FETCHING    │ ──► Call API
                      └─────────────┘
```

---

## User Journey Examples

### New Trader Journey
**Goal**: First-time crypto trader wants to analyze their Solana wallet

1. **Discovery**: Finds app through Twitter/Discord recommendation
2. **Onboarding**: Signs in with email (no complex setup)
3. **First Search**: Enters their wallet address
4. **Learning**: Sees organized trade cycles for the first time
5. **Insight**: Realizes they made profit on BONK but loss on other tokens
6. **Engagement**: Adds missed opportunity they saw on Twitter
7. **Retention**: Returns daily to check new trades

### Experienced Trader Journey  
**Goal**: Active trader wants detailed P/L analysis

1. **Quick Access**: Bookmarked app, auto-signs in
2. **Default Wallet**: Loads their main trading wallet automatically
3. **Recent Activity**: Reviews last 24 hours of trades
4. **Analysis**: Checks P/L on latest memecoin trades
5. **Correction**: Edits incorrect API data for a Jupiter swap
6. **Planning**: Adds coins they're watching to papered plays
7. **Sharing**: Screenshots P/L to share with trading group

### Portfolio Manager Journey
**Goal**: Manages multiple wallets, needs comprehensive view

1. **Multi-Wallet**: Has 5+ wallets saved with nicknames
2. **Comparison**: Switches between wallets to compare performance  
3. **Organization**: Uses nicknames like "DeFi Wallet", "Memecoin Plays"
4. **Analysis**: Reviews monthly P/L across all wallets
5. **Reporting**: Exports data for tax preparation
6. **Optimization**: Identifies best performing strategies

---

This comprehensive user flow documentation covers all major user interactions, edge cases, and state management within the Solana Wallet Tracker application.
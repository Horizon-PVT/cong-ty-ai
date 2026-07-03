# Lead Research Checklist — Alex Minh AI
## Milestone 1.0N | Research_AI Department | DEMO / TEMPLATE

**Purpose**: A step-by-step manual workflow for researching 50 SME leads in Thanh Hóa safely using only public sources.

---

## Safety Rules (Hard Locks)
- ✅ Use only: Google Maps, Facebook Pages (public), Zalo OA (public search), business directories
- ❌ NO login to any account during research
- ❌ NO browser automation or scraping tools
- ❌ NO purchase of lead databases
- ❌ NO contact with real customers during research phase
- ❌ DO NOT record real phone numbers in shared systems

---

## Daily Research Workflow

### Step 1 — Identify Target Vertical (10 min)
Choose from 8 target verticals. Prioritize verticals with high revenue-priority score (see revenue-priority-matrix.json).

### Step 2 — Google Maps Search (20 min per vertical)
Search: "[vertical] Thanh Hóa" or "[vertical] Sầm Sơn"
For each result:
- [ ] Business name
- [ ] Category confirmed (matches target vertical?)
- [ ] Has Facebook Page? (Y/N)
- [ ] Has Zalo OA? (Y/N)
- [ ] Has website? (Y/N — note if website is old/broken)
- [ ] Visible customer reviews? (>10 reviews = active)
- [ ] Approximate location (central Thanh Hóa vs Sầm Sơn)

### Step 3 — Facebook Page Check (5 min per lead)
Search business name on Facebook:
- [ ] Page exists and is active (last post <30 days ago)?
- [ ] Follower count (>500 = established)
- [ ] Comments/engagement visible?
- [ ] Any chatbot or auto-reply visible?
- [ ] Any website link in bio?

### Step 4 — Score the Lead (5 min per lead)
Use lead-scoring-model.json to score 1–5 on each dimension:
1. digital_need (does their online presence need improvement?)
2. revenue_fit (can they afford 12.9M?)
3. accessibility (can salesperson reach them easily?)
4. pain_intensity (active signs of customer service bottleneck?)
5. decision_speed (owner-operated = faster decision)

### Step 5 — Record in Lead Board Template
Copy the lead into lead-board-template.md in the correct tier section.

### Step 6 — Prepare Outreach Draft
Use outreach-preparation-guide.md to select the right message template for this vertical.
Draft the opening message — DO NOT SEND during research phase.

---

## Daily Targets (7-Day Plan)
| Day | Target Leads | Verticals |
|-----|--------------|-----------|
| Day 1 | 8 | Spa, Thẩm mỹ viện |
| Day 2 | 8 | Nha khoa, Phòng khám |
| Day 3 | 7 | Homestay / Khách sạn Sầm Sơn |
| Day 4 | 7 | Nhà hàng / Cafe |
| Day 5 | 7 | Giáo dục / Trung tâm ngoại ngữ |
| Day 6 | 7 | Bất động sản / Cho thuê |
| Day 7 | 6 | Review, re-score, finalize top 15 |

---

## Output Required
- 50 leads entered in lead-board-template.md
- All leads scored in demo-lead-dataset.json format
- Top 15 priority leads flagged for outreach
- Outreach drafts prepared (NOT sent)

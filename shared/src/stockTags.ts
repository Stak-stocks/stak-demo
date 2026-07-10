// Single source of truth for per-ticker recommendation tags. Previously duplicated
// byte-for-byte between frontend/src/data/stockTags.ts and backend/src/data/stockTags.ts;
// both deleted once every consumer here was repointed to this file.
//
// CLOSED-VOCABULARY CONTRACT for anything that adds a new entry (by hand or via the
// brand-generation tool): `learningTags[].tag` should be chosen from the existing keys
// of `TAG_TO_DISPLAY_BUCKETS` (shared/src/displayCategories.ts) wherever the company
// genuinely fits one. A tag NOT in that map doesn't break anything -- it just silently
// gets zero credit toward any of the 5 profile-page display buckets, a soft miss, not a
// hard error. Six tags are deliberately left out of that map on purpose (etf/index/
// diversified/broad_market for index funds; cyclical/healthcare because they're too broad
// to bucket precisely) -- see that file's header comment before assuming an unmapped tag
// is a bug. `primaryCategory` similarly doesn't need to match a fixed list to function
// (recommendationScoring.ts's diversity-penalty logic just compares it for equality), but
// matching one of THEME_TAG_MAP's existing `categories` entries (shared/src/
// recommendationScoring.ts) is what makes a stock eligible for daily-brief theme-boost
// correlation -- also a soft miss if it doesn't, not a hard requirement.
//
// savePoints/learnMorePoints/passPoints/removePoints used to be stored here too,
// but they're 100% derived from weight via ACTION_POINTS below (weight * ACTION_POINTS.save,
// etc) and nothing ever read the pre-computed versions -- compute at point of use instead.
export type WeightedLearningTag = { tag: string; weight: number };

export type StakStockTagConfig = { ticker: string; sourceSection: string; primaryCategory: string; displayTags: string[]; learningTags: WeightedLearningTag[] };

export const STAK_WEIGHTED_STOCK_TAGS: StakStockTagConfig[] = [
  {
    "ticker": "TSLA",
    "sourceSection": "Popular",
    "primaryCategory": "auto_ev",
    "displayTags": [
      "EV/Auto",
      "Consumer Brand",
      "High Growth",
      "Speculative"
    ],
    "learningTags": [
      {
        "tag": "electric_vehicles",
        "weight": 1.0,
      },
      {
        "tag": "auto",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "speculative",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "AAPL",
    "sourceSection": "Popular",
    "primaryCategory": "consumer_tech",
    "displayTags": [
      "Consumer Tech",
      "Familiar Brand",
      "Hardware",
      "Services"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "hardware",
        "weight": 0.75,
      },
      {
        "tag": "services",
        "weight": 0.5,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "NVDA",
    "sourceSection": "Popular",
    "primaryCategory": "semiconductor",
    "displayTags": [
      "AI",
      "Semiconductor",
      "High Growth",
      "Data Center"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "ai",
        "weight": 1.0,
      },
      {
        "tag": "semiconductor",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "data_center",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "RBLX",
    "sourceSection": "Popular",
    "primaryCategory": "gaming",
    "displayTags": [
      "Gaming",
      "Entertainment",
      "Consumer Platform",
      "Digital Media"
    ],
    "learningTags": [
      {
        "tag": "gaming",
        "weight": 1.0,
      },
      {
        "tag": "entertainment",
        "weight": 0.75,
      },
      {
        "tag": "consumer_platform",
        "weight": 0.75,
      },
      {
        "tag": "digital_media",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "META",
    "sourceSection": "Popular",
    "primaryCategory": "social_media",
    "displayTags": [
      "Social Platform",
      "Digital Ads",
      "Consumer App",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "consumer_platform",
        "weight": 0.75,
      },
      {
        "tag": "social_media",
        "weight": 1.0,
      },
      {
        "tag": "digital_ads",
        "weight": 0.75,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "NKE",
    "sourceSection": "Popular",
    "primaryCategory": "apparel_beauty",
    "displayTags": [
      "Consumer Brand",
      "Apparel/Beauty",
      "Retail",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "apparel_beauty",
        "weight": 1.0,
      },
      {
        "tag": "retail",
        "weight": 1.0,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "SBUX",
    "sourceSection": "Popular",
    "primaryCategory": "restaurant",
    "displayTags": [
      "Consumer Brand",
      "Restaurant",
      "Familiar Brand",
      "Everyday Spending"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "restaurant",
        "weight": 1.0,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "SPOT",
    "sourceSection": "Popular",
    "primaryCategory": "streaming_media",
    "displayTags": [
      "Streaming",
      "Entertainment",
      "Consumer Brand",
      "Subscriptions"
    ],
    "learningTags": [
      {
        "tag": "streaming",
        "weight": 1.0,
      },
      {
        "tag": "entertainment",
        "weight": 0.75,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "subscription",
        "weight": 0.75,
      },
      {
        "tag": "media",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "AMZN",
    "sourceSection": "Popular",
    "primaryCategory": "ecommerce_marketplace",
    "displayTags": [
      "E-Commerce",
      "Marketplace",
      "Consumer Brand",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "ecommerce",
        "weight": 1.0,
      },
      {
        "tag": "marketplace",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "NFLX",
    "sourceSection": "Popular",
    "primaryCategory": "streaming_media",
    "displayTags": [
      "Streaming",
      "Entertainment",
      "Consumer Brand",
      "Subscriptions"
    ],
    "learningTags": [
      {
        "tag": "streaming",
        "weight": 1.0,
      },
      {
        "tag": "entertainment",
        "weight": 0.75,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "subscription",
        "weight": 0.75,
      },
      {
        "tag": "media",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "COIN",
    "sourceSection": "Popular",
    "primaryCategory": "crypto_fintech",
    "displayTags": [
      "Crypto",
      "Fintech",
      "Trading Platform",
      "Speculative"
    ],
    "learningTags": [
      {
        "tag": "crypto",
        "weight": 1.0,
      },
      {
        "tag": "fintech",
        "weight": 1.0,
      },
      {
        "tag": "trading_platform",
        "weight": 1.0,
      },
      {
        "tag": "speculative",
        "weight": 0.75,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "MSFT",
    "sourceSection": "Popular",
    "primaryCategory": "mega_cap_tech",
    "displayTags": [
      "Tech",
      "AI",
      "Consumer Platform",
      "Mega Cap"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "ai",
        "weight": 1.0,
      },
      {
        "tag": "consumer_platform",
        "weight": 0.75,
      },
      {
        "tag": "mega_cap",
        "weight": 0.5,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "GOOGL",
    "sourceSection": "Popular",
    "primaryCategory": "mega_cap_tech",
    "displayTags": [
      "Tech",
      "AI",
      "Consumer Platform",
      "Mega Cap"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "ai",
        "weight": 1.0,
      },
      {
        "tag": "consumer_platform",
        "weight": 0.75,
      },
      {
        "tag": "mega_cap",
        "weight": 0.5,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "DIS",
    "sourceSection": "Popular",
    "primaryCategory": "streaming_media",
    "displayTags": [
      "Streaming",
      "Entertainment",
      "Consumer Brand",
      "Subscriptions"
    ],
    "learningTags": [
      {
        "tag": "streaming",
        "weight": 1.0,
      },
      {
        "tag": "entertainment",
        "weight": 0.75,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "subscription",
        "weight": 0.75,
      },
      {
        "tag": "media",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "UBER",
    "sourceSection": "Popular",
    "primaryCategory": "travel_rideshare",
    "displayTags": [
      "Travel",
      "Mobility",
      "Consumer App",
      "Marketplace"
    ],
    "learningTags": [
      {
        "tag": "travel",
        "weight": 1.0,
      },
      {
        "tag": "mobility",
        "weight": 0.75,
      },
      {
        "tag": "consumer_platform",
        "weight": 0.75,
      },
      {
        "tag": "marketplace",
        "weight": 1.0,
      },
      {
        "tag": "gig_economy",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "SHOP",
    "sourceSection": "Popular",
    "primaryCategory": "ecommerce_marketplace",
    "displayTags": [
      "E-Commerce",
      "Marketplace",
      "Consumer Brand",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "ecommerce",
        "weight": 1.0,
      },
      {
        "tag": "marketplace",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "AMD",
    "sourceSection": "Popular",
    "primaryCategory": "semiconductor",
    "displayTags": [
      "AI",
      "Semiconductor",
      "High Growth",
      "Data Center"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "ai",
        "weight": 1.0,
      },
      {
        "tag": "semiconductor",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "data_center",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "SPY",
    "sourceSection": "Popular",
    "primaryCategory": "etf_index",
    "displayTags": [
      "ETF",
      "Market Index",
      "Diversified",
      "Broad Exposure"
    ],
    "learningTags": [
      {
        "tag": "etf",
        "weight": 1.0,
      },
      {
        "tag": "index",
        "weight": 0.75,
      },
      {
        "tag": "diversified",
        "weight": 0.5,
      },
      {
        "tag": "broad_market",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "QQQ",
    "sourceSection": "Popular",
    "primaryCategory": "etf_index",
    "displayTags": [
      "ETF",
      "Market Index",
      "Diversified",
      "Broad Exposure"
    ],
    "learningTags": [
      {
        "tag": "etf",
        "weight": 1.0,
      },
      {
        "tag": "index",
        "weight": 0.75,
      },
      {
        "tag": "diversified",
        "weight": 0.5,
      },
      {
        "tag": "broad_market",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "PYPL",
    "sourceSection": "Popular",
    "primaryCategory": "fintech_payments",
    "displayTags": [
      "Fintech",
      "Payments",
      "Consumer Finance",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "fintech",
        "weight": 1.0,
      },
      {
        "tag": "payments",
        "weight": 1.0,
      },
      {
        "tag": "consumer_finance",
        "weight": 0.75,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "INTC",
    "sourceSection": "Popular",
    "primaryCategory": "semiconductor",
    "displayTags": [
      "AI",
      "Semiconductor",
      "High Growth",
      "Data Center"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "ai",
        "weight": 1.0,
      },
      {
        "tag": "semiconductor",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "data_center",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "IONQ",
    "sourceSection": "Popular",
    "primaryCategory": "space_airmobility",
    "displayTags": [
      "Space/Air Mobility",
      "Speculative",
      "High Growth",
      "Innovation"
    ],
    "learningTags": [
      {
        "tag": "space",
        "weight": 1.0,
      },
      {
        "tag": "air_mobility",
        "weight": 1.0,
      },
      {
        "tag": "speculative",
        "weight": 0.75,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "innovation",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "TSM",
    "sourceSection": "Popular",
    "primaryCategory": "semiconductor",
    "displayTags": [
      "AI",
      "Semiconductor",
      "High Growth",
      "Data Center"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "ai",
        "weight": 1.0,
      },
      {
        "tag": "semiconductor",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "data_center",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "QCOM",
    "sourceSection": "Popular",
    "primaryCategory": "semiconductor",
    "displayTags": [
      "AI",
      "Semiconductor",
      "High Growth",
      "Data Center"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "ai",
        "weight": 1.0,
      },
      {
        "tag": "semiconductor",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "data_center",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "AVGO",
    "sourceSection": "Popular",
    "primaryCategory": "semiconductor",
    "displayTags": [
      "AI",
      "Semiconductor",
      "High Growth",
      "Data Center"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "ai",
        "weight": 1.0,
      },
      {
        "tag": "semiconductor",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "data_center",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "MU",
    "sourceSection": "Popular",
    "primaryCategory": "semiconductor",
    "displayTags": [
      "AI",
      "Semiconductor",
      "High Growth",
      "Data Center"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "ai",
        "weight": 1.0,
      },
      {
        "tag": "semiconductor",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "data_center",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "ASML",
    "sourceSection": "Popular",
    "primaryCategory": "semiconductor_equipment",
    "displayTags": [
      "Semiconductor",
      "Chip Equipment",
      "AI Supply Chain",
      "Cyclical"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "semiconductor",
        "weight": 1.0,
      },
      {
        "tag": "chip_equipment",
        "weight": 0.75,
      },
      {
        "tag": "ai_supply_chain",
        "weight": 0.75,
      },
      {
        "tag": "cyclical",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "NEE",
    "sourceSection": "Popular",
    "primaryCategory": "clean_energy",
    "displayTags": [
      "Clean Energy",
      "Solar",
      "High Growth",
      "Policy-Linked"
    ],
    "learningTags": [
      {
        "tag": "energy",
        "weight": 1.0,
      },
      {
        "tag": "clean_energy",
        "weight": 1.0,
      },
      {
        "tag": "solar",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "policy_linked",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "ENPH",
    "sourceSection": "Popular",
    "primaryCategory": "clean_energy",
    "displayTags": [
      "Clean Energy",
      "Solar",
      "High Growth",
      "Policy-Linked"
    ],
    "learningTags": [
      {
        "tag": "energy",
        "weight": 1.0,
      },
      {
        "tag": "clean_energy",
        "weight": 1.0,
      },
      {
        "tag": "solar",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "policy_linked",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "FSLR",
    "sourceSection": "Popular",
    "primaryCategory": "clean_energy",
    "displayTags": [
      "Clean Energy",
      "Solar",
      "High Growth",
      "Policy-Linked"
    ],
    "learningTags": [
      {
        "tag": "energy",
        "weight": 1.0,
      },
      {
        "tag": "clean_energy",
        "weight": 1.0,
      },
      {
        "tag": "solar",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "policy_linked",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "PLUG",
    "sourceSection": "Popular",
    "primaryCategory": "clean_energy",
    "displayTags": [
      "Clean Energy",
      "Solar",
      "High Growth",
      "Policy-Linked"
    ],
    "learningTags": [
      {
        "tag": "energy",
        "weight": 1.0,
      },
      {
        "tag": "clean_energy",
        "weight": 1.0,
      },
      {
        "tag": "solar",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "policy_linked",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "XOM",
    "sourceSection": "Popular",
    "primaryCategory": "energy_oilgas",
    "displayTags": [
      "Energy",
      "Oil & Gas",
      "Commodity",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "energy",
        "weight": 1.0,
      },
      {
        "tag": "oil_gas",
        "weight": 1.0,
      },
      {
        "tag": "commodity_sensitive",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "CVX",
    "sourceSection": "Popular",
    "primaryCategory": "energy_oilgas",
    "displayTags": [
      "Energy",
      "Oil & Gas",
      "Commodity",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "energy",
        "weight": 1.0,
      },
      {
        "tag": "oil_gas",
        "weight": 1.0,
      },
      {
        "tag": "commodity_sensitive",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "V",
    "sourceSection": "Popular",
    "primaryCategory": "payment_network",
    "displayTags": [
      "Payments",
      "Financial Network",
      "Consumer Spending",
      "High Margin"
    ],
    "learningTags": [
      {
        "tag": "payments",
        "weight": 1.0,
      },
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "consumer_spending",
        "weight": 0.5,
      },
      {
        "tag": "network_effects",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "MA",
    "sourceSection": "Popular",
    "primaryCategory": "payment_network",
    "displayTags": [
      "Payments",
      "Financial Network",
      "Consumer Spending",
      "High Margin"
    ],
    "learningTags": [
      {
        "tag": "payments",
        "weight": 1.0,
      },
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "consumer_spending",
        "weight": 0.5,
      },
      {
        "tag": "network_effects",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "SQ",
    "sourceSection": "Popular",
    "primaryCategory": "fintech_payments",
    "displayTags": [
      "Fintech",
      "Payments",
      "Consumer Finance",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "fintech",
        "weight": 1.0,
      },
      {
        "tag": "payments",
        "weight": 1.0,
      },
      {
        "tag": "consumer_finance",
        "weight": 0.75,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "HOOD",
    "sourceSection": "Popular",
    "primaryCategory": "fintech_payments",
    "displayTags": [
      "Fintech",
      "Payments",
      "Consumer Finance",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "fintech",
        "weight": 1.0,
      },
      {
        "tag": "payments",
        "weight": 1.0,
      },
      {
        "tag": "consumer_finance",
        "weight": 0.75,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "SOFI",
    "sourceSection": "Popular",
    "primaryCategory": "fintech_payments",
    "displayTags": [
      "Fintech",
      "Payments",
      "Consumer Finance",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "fintech",
        "weight": 1.0,
      },
      {
        "tag": "payments",
        "weight": 1.0,
      },
      {
        "tag": "consumer_finance",
        "weight": 0.75,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "AFRM",
    "sourceSection": "Popular",
    "primaryCategory": "fintech_payments",
    "displayTags": [
      "Fintech",
      "Payments",
      "Consumer Finance",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "fintech",
        "weight": 1.0,
      },
      {
        "tag": "payments",
        "weight": 1.0,
      },
      {
        "tag": "consumer_finance",
        "weight": 0.75,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "TXN",
    "sourceSection": "Popular",
    "primaryCategory": "semiconductor",
    "displayTags": [
      "AI",
      "Semiconductor",
      "High Growth",
      "Data Center"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "ai",
        "weight": 1.0,
      },
      {
        "tag": "semiconductor",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "data_center",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "NXPI",
    "sourceSection": "Popular",
    "primaryCategory": "semiconductor",
    "displayTags": [
      "AI",
      "Semiconductor",
      "High Growth",
      "Data Center"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "ai",
        "weight": 1.0,
      },
      {
        "tag": "semiconductor",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "data_center",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "MRVL",
    "sourceSection": "Popular",
    "primaryCategory": "semiconductor",
    "displayTags": [
      "AI",
      "Semiconductor",
      "High Growth",
      "Data Center"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "ai",
        "weight": 1.0,
      },
      {
        "tag": "semiconductor",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "data_center",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "WMT",
    "sourceSection": "Popular",
    "primaryCategory": "retail",
    "displayTags": [
      "Retail",
      "Consumer Brand",
      "Everyday Spending",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "retail",
        "weight": 1.0,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "TGT",
    "sourceSection": "Popular",
    "primaryCategory": "retail",
    "displayTags": [
      "Retail",
      "Consumer Brand",
      "Everyday Spending",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "retail",
        "weight": 1.0,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "COST",
    "sourceSection": "Popular",
    "primaryCategory": "retail",
    "displayTags": [
      "Retail",
      "Consumer Brand",
      "Everyday Spending",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "retail",
        "weight": 1.0,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "HD",
    "sourceSection": "Popular",
    "primaryCategory": "home_retail",
    "displayTags": [
      "Home Retail",
      "Consumer Brand",
      "Housing-Linked",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "home_retail",
        "weight": 1.0,
      },
      {
        "tag": "housing",
        "weight": 0.75,
      },
      {
        "tag": "retail",
        "weight": 1.0,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "LOW",
    "sourceSection": "Popular",
    "primaryCategory": "home_retail",
    "displayTags": [
      "Home Retail",
      "Consumer Brand",
      "Housing-Linked",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "home_retail",
        "weight": 1.0,
      },
      {
        "tag": "housing",
        "weight": 0.75,
      },
      {
        "tag": "retail",
        "weight": 1.0,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "MCD",
    "sourceSection": "Popular",
    "primaryCategory": "restaurant",
    "displayTags": [
      "Consumer Brand",
      "Restaurant",
      "Familiar Brand",
      "Everyday Spending"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "restaurant",
        "weight": 1.0,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "KO",
    "sourceSection": "Popular",
    "primaryCategory": "beverage",
    "displayTags": [
      "Beverage Brand",
      "Consumer Staples",
      "Everyday Spending",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "beverage",
        "weight": 1.0,
      },
      {
        "tag": "consumer_staples",
        "weight": 1.0,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "PEP",
    "sourceSection": "Popular",
    "primaryCategory": "beverage",
    "displayTags": [
      "Beverage Brand",
      "Consumer Staples",
      "Everyday Spending",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "beverage",
        "weight": 1.0,
      },
      {
        "tag": "consumer_staples",
        "weight": 1.0,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "PG",
    "sourceSection": "Popular",
    "primaryCategory": "consumer_staples",
    "displayTags": [
      "Consumer Staples",
      "Defensive Brand",
      "Everyday Spending",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "consumer_staples",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "JNJ",
    "sourceSection": "Popular",
    "primaryCategory": "default_consumer",
    "displayTags": [
      "Consumer Brand",
      "Retail",
      "Familiar Brand",
      "Everyday Spending"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "retail",
        "weight": 1.0,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "LMT",
    "sourceSection": "Popular",
    "primaryCategory": "aerospace_defense",
    "displayTags": [
      "Aerospace/Defense",
      "Industrial",
      "Government Contracts",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "industrials",
        "weight": 1.0,
      },
      {
        "tag": "aerospace_defense",
        "weight": 1.0,
      },
      {
        "tag": "government_contracts",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "BA",
    "sourceSection": "Popular",
    "primaryCategory": "aerospace_defense",
    "displayTags": [
      "Aerospace/Defense",
      "Industrial",
      "Government Contracts",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "industrials",
        "weight": 1.0,
      },
      {
        "tag": "aerospace_defense",
        "weight": 1.0,
      },
      {
        "tag": "government_contracts",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "UNH",
    "sourceSection": "Popular",
    "primaryCategory": "health_insurance",
    "displayTags": [
      "Health Insurance",
      "Healthcare",
      "Defensive",
      "Managed Care"
    ],
    "learningTags": [
      {
        "tag": "healthcare",
        "weight": 1.0,
      },
      {
        "tag": "insurance",
        "weight": 1.0,
      },
      {
        "tag": "managed_care",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "CRM",
    "sourceSection": "Popular",
    "primaryCategory": "enterprise_software",
    "displayTags": [
      "Enterprise Software",
      "Cloud",
      "SaaS",
      "Recurring Revenue"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "cloud",
        "weight": 0.75,
      },
      {
        "tag": "saas",
        "weight": 1.0,
      },
      {
        "tag": "recurring_revenue",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "ADBE",
    "sourceSection": "Popular",
    "primaryCategory": "enterprise_software",
    "displayTags": [
      "Enterprise Software",
      "Cloud",
      "SaaS",
      "Recurring Revenue"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "cloud",
        "weight": 0.75,
      },
      {
        "tag": "saas",
        "weight": 1.0,
      },
      {
        "tag": "recurring_revenue",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "NOW",
    "sourceSection": "Popular",
    "primaryCategory": "enterprise_software",
    "displayTags": [
      "Enterprise Software",
      "Cloud",
      "SaaS",
      "Recurring Revenue"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "cloud",
        "weight": 0.75,
      },
      {
        "tag": "saas",
        "weight": 1.0,
      },
      {
        "tag": "recurring_revenue",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "INTU",
    "sourceSection": "Popular",
    "primaryCategory": "enterprise_software",
    "displayTags": [
      "Enterprise Software",
      "Cloud",
      "SaaS",
      "Recurring Revenue"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "cloud",
        "weight": 0.75,
      },
      {
        "tag": "saas",
        "weight": 1.0,
      },
      {
        "tag": "recurring_revenue",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "AMAT",
    "sourceSection": "Popular",
    "primaryCategory": "semiconductor_equipment",
    "displayTags": [
      "Semiconductor",
      "Chip Equipment",
      "AI Supply Chain",
      "Cyclical"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "semiconductor",
        "weight": 1.0,
      },
      {
        "tag": "chip_equipment",
        "weight": 0.75,
      },
      {
        "tag": "ai_supply_chain",
        "weight": 0.75,
      },
      {
        "tag": "cyclical",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "ABNB",
    "sourceSection": "Popular",
    "primaryCategory": "travel_rideshare",
    "displayTags": [
      "Travel",
      "Mobility",
      "Consumer App",
      "Marketplace"
    ],
    "learningTags": [
      {
        "tag": "travel",
        "weight": 1.0,
      },
      {
        "tag": "mobility",
        "weight": 0.75,
      },
      {
        "tag": "consumer_platform",
        "weight": 0.75,
      },
      {
        "tag": "marketplace",
        "weight": 1.0,
      },
      {
        "tag": "gig_economy",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "LYFT",
    "sourceSection": "Popular",
    "primaryCategory": "travel_rideshare",
    "displayTags": [
      "Travel",
      "Mobility",
      "Consumer App",
      "Marketplace"
    ],
    "learningTags": [
      {
        "tag": "travel",
        "weight": 1.0,
      },
      {
        "tag": "mobility",
        "weight": 0.75,
      },
      {
        "tag": "consumer_platform",
        "weight": 0.75,
      },
      {
        "tag": "marketplace",
        "weight": 1.0,
      },
      {
        "tag": "gig_economy",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "DDOG",
    "sourceSection": "Popular",
    "primaryCategory": "database_data",
    "displayTags": [
      "Data Cloud",
      "Analytics",
      "Enterprise Software",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "data_cloud",
        "weight": 1.0,
      },
      {
        "tag": "analytics",
        "weight": 0.75,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "SNOW",
    "sourceSection": "Popular",
    "primaryCategory": "database_data",
    "displayTags": [
      "Data Cloud",
      "Analytics",
      "Enterprise Software",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "data_cloud",
        "weight": 1.0,
      },
      {
        "tag": "analytics",
        "weight": 0.75,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "MDB",
    "sourceSection": "Popular",
    "primaryCategory": "database_data",
    "displayTags": [
      "Data Cloud",
      "Analytics",
      "Enterprise Software",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "data_cloud",
        "weight": 1.0,
      },
      {
        "tag": "analytics",
        "weight": 0.75,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "PANW",
    "sourceSection": "Popular",
    "primaryCategory": "cybersecurity",
    "displayTags": [
      "Cybersecurity",
      "Cloud Software",
      "Enterprise Tech",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "cybersecurity",
        "weight": 1.0,
      },
      {
        "tag": "cloud",
        "weight": 0.75,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "CRWD",
    "sourceSection": "Popular",
    "primaryCategory": "cybersecurity",
    "displayTags": [
      "Cybersecurity",
      "Cloud Software",
      "Enterprise Tech",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "cybersecurity",
        "weight": 1.0,
      },
      {
        "tag": "cloud",
        "weight": 0.75,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "ZM",
    "sourceSection": "Popular",
    "primaryCategory": "enterprise_software",
    "displayTags": [
      "Enterprise Software",
      "Cloud",
      "SaaS",
      "Recurring Revenue"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "cloud",
        "weight": 0.75,
      },
      {
        "tag": "saas",
        "weight": 1.0,
      },
      {
        "tag": "recurring_revenue",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "PLTR",
    "sourceSection": "Popular",
    "primaryCategory": "automation_ai",
    "displayTags": [
      "Automation",
      "AI Software",
      "Enterprise Tech",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "automation",
        "weight": 0.75,
      },
      {
        "tag": "ai",
        "weight": 1.0,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "HON",
    "sourceSection": "Popular",
    "primaryCategory": "industrial",
    "displayTags": [
      "Industrial",
      "Infrastructure",
      "Cyclical",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "industrials",
        "weight": 1.0,
      },
      {
        "tag": "infrastructure",
        "weight": 0.75,
      },
      {
        "tag": "cyclical",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "LRLCY",
    "sourceSection": "Popular",
    "primaryCategory": "apparel_beauty",
    "displayTags": [
      "Consumer Brand",
      "Apparel/Beauty",
      "Retail",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "apparel_beauty",
        "weight": 1.0,
      },
      {
        "tag": "retail",
        "weight": 1.0,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "EL",
    "sourceSection": "Popular",
    "primaryCategory": "apparel_beauty",
    "displayTags": [
      "Consumer Brand",
      "Apparel/Beauty",
      "Retail",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "apparel_beauty",
        "weight": 1.0,
      },
      {
        "tag": "retail",
        "weight": 1.0,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "ELF",
    "sourceSection": "Popular",
    "primaryCategory": "apparel_beauty",
    "displayTags": [
      "Consumer Brand",
      "Apparel/Beauty",
      "Retail",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "apparel_beauty",
        "weight": 1.0,
      },
      {
        "tag": "retail",
        "weight": 1.0,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "ULTA",
    "sourceSection": "Popular",
    "primaryCategory": "apparel_beauty",
    "displayTags": [
      "Consumer Brand",
      "Apparel/Beauty",
      "Retail",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "apparel_beauty",
        "weight": 1.0,
      },
      {
        "tag": "retail",
        "weight": 1.0,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "COTY",
    "sourceSection": "Popular",
    "primaryCategory": "apparel_beauty",
    "displayTags": [
      "Consumer Brand",
      "Apparel/Beauty",
      "Retail",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "apparel_beauty",
        "weight": 1.0,
      },
      {
        "tag": "retail",
        "weight": 1.0,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "JPM",
    "sourceSection": "Finance",
    "primaryCategory": "bank",
    "displayTags": [
      "Banking",
      "Financials",
      "Interest Rates",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "banking",
        "weight": 1.0,
      },
      {
        "tag": "interest_rates",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "GS",
    "sourceSection": "Finance",
    "primaryCategory": "capital_markets",
    "displayTags": [
      "Capital Markets",
      "Financials",
      "Markets",
      "Asset-Light"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "capital_markets",
        "weight": 1.0,
      },
      {
        "tag": "markets",
        "weight": 0.75,
      },
      {
        "tag": "asset_light",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "MS",
    "sourceSection": "Finance",
    "primaryCategory": "capital_markets",
    "displayTags": [
      "Capital Markets",
      "Financials",
      "Markets",
      "Asset-Light"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "capital_markets",
        "weight": 1.0,
      },
      {
        "tag": "markets",
        "weight": 0.75,
      },
      {
        "tag": "asset_light",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "C",
    "sourceSection": "Finance",
    "primaryCategory": "bank",
    "displayTags": [
      "Banking",
      "Financials",
      "Interest Rates",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "banking",
        "weight": 1.0,
      },
      {
        "tag": "interest_rates",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "BAC",
    "sourceSection": "Finance",
    "primaryCategory": "bank",
    "displayTags": [
      "Banking",
      "Financials",
      "Interest Rates",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "banking",
        "weight": 1.0,
      },
      {
        "tag": "interest_rates",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "WFC",
    "sourceSection": "Finance",
    "primaryCategory": "bank",
    "displayTags": [
      "Banking",
      "Financials",
      "Interest Rates",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "banking",
        "weight": 1.0,
      },
      {
        "tag": "interest_rates",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "BLK",
    "sourceSection": "Finance",
    "primaryCategory": "asset_manager",
    "displayTags": [
      "Asset Manager",
      "Financials",
      "Markets",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "asset_management",
        "weight": 1.0,
      },
      {
        "tag": "markets",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "AXP",
    "sourceSection": "Finance",
    "primaryCategory": "default_finance",
    "displayTags": [
      "Financials",
      "Markets",
      "Dividend",
      "Interest Rates"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "markets",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      },
      {
        "tag": "interest_rates",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "COF",
    "sourceSection": "Finance",
    "primaryCategory": "bank",
    "displayTags": [
      "Banking",
      "Financials",
      "Interest Rates",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "banking",
        "weight": 1.0,
      },
      {
        "tag": "interest_rates",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "SCHW",
    "sourceSection": "Finance",
    "primaryCategory": "bank",
    "displayTags": [
      "Banking",
      "Financials",
      "Interest Rates",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "banking",
        "weight": 1.0,
      },
      {
        "tag": "interest_rates",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "BX",
    "sourceSection": "Finance",
    "primaryCategory": "private_equity",
    "displayTags": [
      "Private Markets",
      "Financials",
      "Alternative Assets",
      "Markets"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "private_equity",
        "weight": 1.0,
      },
      {
        "tag": "alternative_assets",
        "weight": 1.0,
      },
      {
        "tag": "markets",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "KKR",
    "sourceSection": "Finance",
    "primaryCategory": "private_equity",
    "displayTags": [
      "Private Markets",
      "Financials",
      "Alternative Assets",
      "Markets"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "private_equity",
        "weight": 1.0,
      },
      {
        "tag": "alternative_assets",
        "weight": 1.0,
      },
      {
        "tag": "markets",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "APO",
    "sourceSection": "Finance",
    "primaryCategory": "private_equity",
    "displayTags": [
      "Private Markets",
      "Financials",
      "Alternative Assets",
      "Markets"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "private_equity",
        "weight": 1.0,
      },
      {
        "tag": "alternative_assets",
        "weight": 1.0,
      },
      {
        "tag": "markets",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "AIG",
    "sourceSection": "Finance",
    "primaryCategory": "insurance",
    "displayTags": [
      "Insurance",
      "Financials",
      "Defensive",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "insurance",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "MET",
    "sourceSection": "Finance",
    "primaryCategory": "insurance",
    "displayTags": [
      "Insurance",
      "Financials",
      "Defensive",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "insurance",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "PRU",
    "sourceSection": "Finance",
    "primaryCategory": "insurance",
    "displayTags": [
      "Insurance",
      "Financials",
      "Defensive",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "insurance",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "AFL",
    "sourceSection": "Finance",
    "primaryCategory": "insurance",
    "displayTags": [
      "Insurance",
      "Financials",
      "Defensive",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "insurance",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "ALL",
    "sourceSection": "Finance",
    "primaryCategory": "insurance",
    "displayTags": [
      "Insurance",
      "Financials",
      "Defensive",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "insurance",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "CB",
    "sourceSection": "Finance",
    "primaryCategory": "insurance",
    "displayTags": [
      "Insurance",
      "Financials",
      "Defensive",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "insurance",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "TRV",
    "sourceSection": "Finance",
    "primaryCategory": "insurance",
    "displayTags": [
      "Insurance",
      "Financials",
      "Defensive",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "insurance",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "HIG",
    "sourceSection": "Finance",
    "primaryCategory": "insurance",
    "displayTags": [
      "Insurance",
      "Financials",
      "Defensive",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "insurance",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "FIS",
    "sourceSection": "Finance",
    "primaryCategory": "payment_network",
    "displayTags": [
      "Payments",
      "Financial Network",
      "Consumer Spending",
      "High Margin"
    ],
    "learningTags": [
      {
        "tag": "payments",
        "weight": 1.0,
      },
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "consumer_spending",
        "weight": 0.5,
      },
      {
        "tag": "network_effects",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "FISV",
    "sourceSection": "Finance",
    "primaryCategory": "payment_network",
    "displayTags": [
      "Payments",
      "Financial Network",
      "Consumer Spending",
      "High Margin"
    ],
    "learningTags": [
      {
        "tag": "payments",
        "weight": 1.0,
      },
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "consumer_spending",
        "weight": 0.5,
      },
      {
        "tag": "network_effects",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "GPN",
    "sourceSection": "Finance",
    "primaryCategory": "payment_network",
    "displayTags": [
      "Payments",
      "Financial Network",
      "Consumer Spending",
      "High Margin"
    ],
    "learningTags": [
      {
        "tag": "payments",
        "weight": 1.0,
      },
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "consumer_spending",
        "weight": 0.5,
      },
      {
        "tag": "network_effects",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "ADP",
    "sourceSection": "Finance",
    "primaryCategory": "financial_data",
    "displayTags": [
      "Financial Data",
      "Markets",
      "Subscription",
      "Enterprise"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "financial_data",
        "weight": 1.0,
      },
      {
        "tag": "subscription",
        "weight": 0.75,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "NDAQ",
    "sourceSection": "Finance",
    "primaryCategory": "capital_markets",
    "displayTags": [
      "Capital Markets",
      "Financials",
      "Markets",
      "Asset-Light"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "capital_markets",
        "weight": 1.0,
      },
      {
        "tag": "markets",
        "weight": 0.75,
      },
      {
        "tag": "asset_light",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "ICE",
    "sourceSection": "Finance",
    "primaryCategory": "capital_markets",
    "displayTags": [
      "Capital Markets",
      "Financials",
      "Markets",
      "Asset-Light"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "capital_markets",
        "weight": 1.0,
      },
      {
        "tag": "markets",
        "weight": 0.75,
      },
      {
        "tag": "asset_light",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "CME",
    "sourceSection": "Finance",
    "primaryCategory": "capital_markets",
    "displayTags": [
      "Capital Markets",
      "Financials",
      "Markets",
      "Asset-Light"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "capital_markets",
        "weight": 1.0,
      },
      {
        "tag": "markets",
        "weight": 0.75,
      },
      {
        "tag": "asset_light",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "SPGI",
    "sourceSection": "Finance",
    "primaryCategory": "financial_data",
    "displayTags": [
      "Financial Data",
      "Markets",
      "Subscription",
      "Enterprise"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "financial_data",
        "weight": 1.0,
      },
      {
        "tag": "subscription",
        "weight": 0.75,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "MCO",
    "sourceSection": "Finance",
    "primaryCategory": "financial_data",
    "displayTags": [
      "Financial Data",
      "Markets",
      "Subscription",
      "Enterprise"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "financial_data",
        "weight": 1.0,
      },
      {
        "tag": "subscription",
        "weight": 0.75,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "MSCI",
    "sourceSection": "Finance",
    "primaryCategory": "financial_data",
    "displayTags": [
      "Financial Data",
      "Markets",
      "Subscription",
      "Enterprise"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "financial_data",
        "weight": 1.0,
      },
      {
        "tag": "subscription",
        "weight": 0.75,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "TROW",
    "sourceSection": "Finance",
    "primaryCategory": "asset_manager",
    "displayTags": [
      "Asset Manager",
      "Financials",
      "Markets",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "asset_management",
        "weight": 1.0,
      },
      {
        "tag": "markets",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "IVZ",
    "sourceSection": "Finance",
    "primaryCategory": "asset_manager",
    "displayTags": [
      "Asset Manager",
      "Financials",
      "Markets",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "asset_management",
        "weight": 1.0,
      },
      {
        "tag": "markets",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "BEN",
    "sourceSection": "Finance",
    "primaryCategory": "asset_manager",
    "displayTags": [
      "Asset Manager",
      "Financials",
      "Markets",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "asset_management",
        "weight": 1.0,
      },
      {
        "tag": "markets",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "SYF",
    "sourceSection": "Finance",
    "primaryCategory": "bank",
    "displayTags": [
      "Banking",
      "Financials",
      "Interest Rates",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "banking",
        "weight": 1.0,
      },
      {
        "tag": "interest_rates",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "ALLY",
    "sourceSection": "Finance",
    "primaryCategory": "bank",
    "displayTags": [
      "Banking",
      "Financials",
      "Interest Rates",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "banking",
        "weight": 1.0,
      },
      {
        "tag": "interest_rates",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "AMP",
    "sourceSection": "Finance",
    "primaryCategory": "asset_manager",
    "displayTags": [
      "Asset Manager",
      "Financials",
      "Markets",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "asset_management",
        "weight": 1.0,
      },
      {
        "tag": "markets",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "AON",
    "sourceSection": "Finance",
    "primaryCategory": "insurance",
    "displayTags": [
      "Insurance",
      "Financials",
      "Defensive",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "insurance",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "MMC",
    "sourceSection": "Finance",
    "primaryCategory": "insurance",
    "displayTags": [
      "Insurance",
      "Financials",
      "Defensive",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "insurance",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "AJG",
    "sourceSection": "Finance",
    "primaryCategory": "insurance",
    "displayTags": [
      "Insurance",
      "Financials",
      "Defensive",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "insurance",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "PNC",
    "sourceSection": "Finance",
    "primaryCategory": "bank",
    "displayTags": [
      "Banking",
      "Financials",
      "Interest Rates",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "banking",
        "weight": 1.0,
      },
      {
        "tag": "interest_rates",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "USB",
    "sourceSection": "Finance",
    "primaryCategory": "bank",
    "displayTags": [
      "Banking",
      "Financials",
      "Interest Rates",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "banking",
        "weight": 1.0,
      },
      {
        "tag": "interest_rates",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "TFC",
    "sourceSection": "Finance",
    "primaryCategory": "bank",
    "displayTags": [
      "Banking",
      "Financials",
      "Interest Rates",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "banking",
        "weight": 1.0,
      },
      {
        "tag": "interest_rates",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "EFX",
    "sourceSection": "Finance",
    "primaryCategory": "financial_data",
    "displayTags": [
      "Financial Data",
      "Markets",
      "Subscription",
      "Enterprise"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "financial_data",
        "weight": 1.0,
      },
      {
        "tag": "subscription",
        "weight": 0.75,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "PAYX",
    "sourceSection": "Finance",
    "primaryCategory": "financial_data",
    "displayTags": [
      "Financial Data",
      "Markets",
      "Subscription",
      "Enterprise"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "financial_data",
        "weight": 1.0,
      },
      {
        "tag": "subscription",
        "weight": 0.75,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "NTRS",
    "sourceSection": "Finance",
    "primaryCategory": "asset_manager",
    "displayTags": [
      "Asset Manager",
      "Financials",
      "Markets",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "asset_management",
        "weight": 1.0,
      },
      {
        "tag": "markets",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "STT",
    "sourceSection": "Finance",
    "primaryCategory": "asset_manager",
    "displayTags": [
      "Asset Manager",
      "Financials",
      "Markets",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "asset_management",
        "weight": 1.0,
      },
      {
        "tag": "markets",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "BK",
    "sourceSection": "Finance",
    "primaryCategory": "asset_manager",
    "displayTags": [
      "Asset Manager",
      "Financials",
      "Markets",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "asset_management",
        "weight": 1.0,
      },
      {
        "tag": "markets",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "RJF",
    "sourceSection": "Finance",
    "primaryCategory": "capital_markets",
    "displayTags": [
      "Capital Markets",
      "Financials",
      "Markets",
      "Asset-Light"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "capital_markets",
        "weight": 1.0,
      },
      {
        "tag": "markets",
        "weight": 0.75,
      },
      {
        "tag": "asset_light",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "CBOE",
    "sourceSection": "Finance",
    "primaryCategory": "capital_markets",
    "displayTags": [
      "Capital Markets",
      "Financials",
      "Markets",
      "Asset-Light"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "capital_markets",
        "weight": 1.0,
      },
      {
        "tag": "markets",
        "weight": 0.75,
      },
      {
        "tag": "asset_light",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "SSNC",
    "sourceSection": "Finance",
    "primaryCategory": "financial_data",
    "displayTags": [
      "Financial Data",
      "Markets",
      "Subscription",
      "Enterprise"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "financial_data",
        "weight": 1.0,
      },
      {
        "tag": "subscription",
        "weight": 0.75,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "FDS",
    "sourceSection": "Finance",
    "primaryCategory": "financial_data",
    "displayTags": [
      "Financial Data",
      "Markets",
      "Subscription",
      "Enterprise"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "financial_data",
        "weight": 1.0,
      },
      {
        "tag": "subscription",
        "weight": 0.75,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "OMF",
    "sourceSection": "Finance",
    "primaryCategory": "bank",
    "displayTags": [
      "Banking",
      "Financials",
      "Interest Rates",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "banking",
        "weight": 1.0,
      },
      {
        "tag": "interest_rates",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "EVR",
    "sourceSection": "Finance",
    "primaryCategory": "capital_markets",
    "displayTags": [
      "Capital Markets",
      "Financials",
      "Markets",
      "Asset-Light"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "capital_markets",
        "weight": 1.0,
      },
      {
        "tag": "markets",
        "weight": 0.75,
      },
      {
        "tag": "asset_light",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "PFG",
    "sourceSection": "Finance",
    "primaryCategory": "insurance",
    "displayTags": [
      "Insurance",
      "Financials",
      "Defensive",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "insurance",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "LNC",
    "sourceSection": "Finance",
    "primaryCategory": "insurance",
    "displayTags": [
      "Insurance",
      "Financials",
      "Defensive",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "insurance",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "KEY",
    "sourceSection": "Finance",
    "primaryCategory": "bank",
    "displayTags": [
      "Banking",
      "Financials",
      "Interest Rates",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "banking",
        "weight": 1.0,
      },
      {
        "tag": "interest_rates",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "RF",
    "sourceSection": "Finance",
    "primaryCategory": "bank",
    "displayTags": [
      "Banking",
      "Financials",
      "Interest Rates",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "banking",
        "weight": 1.0,
      },
      {
        "tag": "interest_rates",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "CFG",
    "sourceSection": "Finance",
    "primaryCategory": "bank",
    "displayTags": [
      "Banking",
      "Financials",
      "Interest Rates",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "financials",
        "weight": 1.0,
      },
      {
        "tag": "banking",
        "weight": 1.0,
      },
      {
        "tag": "interest_rates",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "ORCL",
    "sourceSection": "Tech",
    "primaryCategory": "enterprise_software",
    "displayTags": [
      "Enterprise Software",
      "Cloud",
      "SaaS",
      "Recurring Revenue"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "cloud",
        "weight": 0.75,
      },
      {
        "tag": "saas",
        "weight": 1.0,
      },
      {
        "tag": "recurring_revenue",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "IBM",
    "sourceSection": "Tech",
    "primaryCategory": "enterprise_software",
    "displayTags": [
      "Enterprise Software",
      "Cloud",
      "SaaS",
      "Recurring Revenue"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "cloud",
        "weight": 0.75,
      },
      {
        "tag": "saas",
        "weight": 1.0,
      },
      {
        "tag": "recurring_revenue",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "HPQ",
    "sourceSection": "Tech",
    "primaryCategory": "default_tech",
    "displayTags": [
      "Technology",
      "Software",
      "High Growth",
      "Innovation"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "innovation",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "DELL",
    "sourceSection": "Tech",
    "primaryCategory": "default_tech",
    "displayTags": [
      "Technology",
      "Software",
      "High Growth",
      "Innovation"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "innovation",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "ACN",
    "sourceSection": "Tech",
    "primaryCategory": "enterprise_software",
    "displayTags": [
      "Enterprise Software",
      "Cloud",
      "SaaS",
      "Recurring Revenue"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "cloud",
        "weight": 0.75,
      },
      {
        "tag": "saas",
        "weight": 1.0,
      },
      {
        "tag": "recurring_revenue",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "SAP",
    "sourceSection": "Tech",
    "primaryCategory": "enterprise_software",
    "displayTags": [
      "Enterprise Software",
      "Cloud",
      "SaaS",
      "Recurring Revenue"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "cloud",
        "weight": 0.75,
      },
      {
        "tag": "saas",
        "weight": 1.0,
      },
      {
        "tag": "recurring_revenue",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "HUBS",
    "sourceSection": "Tech",
    "primaryCategory": "enterprise_software",
    "displayTags": [
      "Enterprise Software",
      "Cloud",
      "SaaS",
      "Recurring Revenue"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "cloud",
        "weight": 0.75,
      },
      {
        "tag": "saas",
        "weight": 1.0,
      },
      {
        "tag": "recurring_revenue",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "TEAM",
    "sourceSection": "Tech",
    "primaryCategory": "enterprise_software",
    "displayTags": [
      "Enterprise Software",
      "Cloud",
      "SaaS",
      "Recurring Revenue"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "cloud",
        "weight": 0.75,
      },
      {
        "tag": "saas",
        "weight": 1.0,
      },
      {
        "tag": "recurring_revenue",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "NET",
    "sourceSection": "Tech",
    "primaryCategory": "cybersecurity",
    "displayTags": [
      "Cybersecurity",
      "Cloud Software",
      "Enterprise Tech",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "cybersecurity",
        "weight": 1.0,
      },
      {
        "tag": "cloud",
        "weight": 0.75,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "OKTA",
    "sourceSection": "Tech",
    "primaryCategory": "cybersecurity",
    "displayTags": [
      "Cybersecurity",
      "Cloud Software",
      "Enterprise Tech",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "cybersecurity",
        "weight": 1.0,
      },
      {
        "tag": "cloud",
        "weight": 0.75,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "FTNT",
    "sourceSection": "Tech",
    "primaryCategory": "cybersecurity",
    "displayTags": [
      "Cybersecurity",
      "Cloud Software",
      "Enterprise Tech",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "cybersecurity",
        "weight": 1.0,
      },
      {
        "tag": "cloud",
        "weight": 0.75,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "ZS",
    "sourceSection": "Tech",
    "primaryCategory": "cybersecurity",
    "displayTags": [
      "Cybersecurity",
      "Cloud Software",
      "Enterprise Tech",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "cybersecurity",
        "weight": 1.0,
      },
      {
        "tag": "cloud",
        "weight": 0.75,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "S",
    "sourceSection": "Tech",
    "primaryCategory": "cybersecurity",
    "displayTags": [
      "Cybersecurity",
      "Cloud Software",
      "Enterprise Tech",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "cybersecurity",
        "weight": 1.0,
      },
      {
        "tag": "cloud",
        "weight": 0.75,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "TWLO",
    "sourceSection": "Tech",
    "primaryCategory": "enterprise_software",
    "displayTags": [
      "Enterprise Software",
      "Cloud",
      "SaaS",
      "Recurring Revenue"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "cloud",
        "weight": 0.75,
      },
      {
        "tag": "saas",
        "weight": 1.0,
      },
      {
        "tag": "recurring_revenue",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "PATH",
    "sourceSection": "Tech",
    "primaryCategory": "automation_ai",
    "displayTags": [
      "Automation",
      "AI Software",
      "Enterprise Tech",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "automation",
        "weight": 0.75,
      },
      {
        "tag": "ai",
        "weight": 1.0,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "BILL",
    "sourceSection": "Tech",
    "primaryCategory": "enterprise_software",
    "displayTags": [
      "Enterprise Software",
      "Cloud",
      "SaaS",
      "Recurring Revenue"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "cloud",
        "weight": 0.75,
      },
      {
        "tag": "saas",
        "weight": 1.0,
      },
      {
        "tag": "recurring_revenue",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "SNAP",
    "sourceSection": "Tech",
    "primaryCategory": "social_media",
    "displayTags": [
      "Social Platform",
      "Digital Ads",
      "Consumer App",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "consumer_platform",
        "weight": 0.75,
      },
      {
        "tag": "social_media",
        "weight": 1.0,
      },
      {
        "tag": "digital_ads",
        "weight": 0.75,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "PINS",
    "sourceSection": "Tech",
    "primaryCategory": "social_media",
    "displayTags": [
      "Social Platform",
      "Digital Ads",
      "Consumer App",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "consumer_platform",
        "weight": 0.75,
      },
      {
        "tag": "social_media",
        "weight": 1.0,
      },
      {
        "tag": "digital_ads",
        "weight": 0.75,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "RDDT",
    "sourceSection": "Tech",
    "primaryCategory": "social_media",
    "displayTags": [
      "Social Platform",
      "Digital Ads",
      "Consumer App",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "consumer_platform",
        "weight": 0.75,
      },
      {
        "tag": "social_media",
        "weight": 1.0,
      },
      {
        "tag": "digital_ads",
        "weight": 0.75,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "MTCH",
    "sourceSection": "Tech",
    "primaryCategory": "social_media",
    "displayTags": [
      "Social Platform",
      "Digital Ads",
      "Consumer App",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "consumer_platform",
        "weight": 0.75,
      },
      {
        "tag": "social_media",
        "weight": 1.0,
      },
      {
        "tag": "digital_ads",
        "weight": 0.75,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "DASH",
    "sourceSection": "Tech",
    "primaryCategory": "ecommerce_marketplace",
    "displayTags": [
      "E-Commerce",
      "Marketplace",
      "Consumer Brand",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "ecommerce",
        "weight": 1.0,
      },
      {
        "tag": "marketplace",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "PTON",
    "sourceSection": "Tech",
    "primaryCategory": "consumer_tech",
    "displayTags": [
      "Consumer Tech",
      "Familiar Brand",
      "Hardware",
      "Services"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "hardware",
        "weight": 0.75,
      },
      {
        "tag": "services",
        "weight": 0.5,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "NU",
    "sourceSection": "Tech",
    "primaryCategory": "fintech_payments",
    "displayTags": [
      "Fintech",
      "Payments",
      "Consumer Finance",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "fintech",
        "weight": 1.0,
      },
      {
        "tag": "payments",
        "weight": 1.0,
      },
      {
        "tag": "consumer_finance",
        "weight": 0.75,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "MELI",
    "sourceSection": "Tech",
    "primaryCategory": "ecommerce_marketplace",
    "displayTags": [
      "E-Commerce",
      "Marketplace",
      "Consumer Brand",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "ecommerce",
        "weight": 1.0,
      },
      {
        "tag": "marketplace",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "SE",
    "sourceSection": "Tech",
    "primaryCategory": "ecommerce_marketplace",
    "displayTags": [
      "E-Commerce",
      "Marketplace",
      "Consumer Brand",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "ecommerce",
        "weight": 1.0,
      },
      {
        "tag": "marketplace",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "DKNG",
    "sourceSection": "Tech",
    "primaryCategory": "gaming",
    "displayTags": [
      "Gaming",
      "Entertainment",
      "Consumer Platform",
      "Digital Media"
    ],
    "learningTags": [
      {
        "tag": "gaming",
        "weight": 1.0,
      },
      {
        "tag": "entertainment",
        "weight": 0.75,
      },
      {
        "tag": "consumer_platform",
        "weight": 0.75,
      },
      {
        "tag": "digital_media",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "ARM",
    "sourceSection": "Tech",
    "primaryCategory": "semiconductor",
    "displayTags": [
      "AI",
      "Semiconductor",
      "High Growth",
      "Data Center"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "ai",
        "weight": 1.0,
      },
      {
        "tag": "semiconductor",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "data_center",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "ON",
    "sourceSection": "Tech",
    "primaryCategory": "semiconductor",
    "displayTags": [
      "AI",
      "Semiconductor",
      "High Growth",
      "Data Center"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "ai",
        "weight": 1.0,
      },
      {
        "tag": "semiconductor",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "data_center",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "ADI",
    "sourceSection": "Tech",
    "primaryCategory": "semiconductor",
    "displayTags": [
      "AI",
      "Semiconductor",
      "High Growth",
      "Data Center"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "ai",
        "weight": 1.0,
      },
      {
        "tag": "semiconductor",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "data_center",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "MPWR",
    "sourceSection": "Tech",
    "primaryCategory": "semiconductor",
    "displayTags": [
      "AI",
      "Semiconductor",
      "High Growth",
      "Data Center"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "ai",
        "weight": 1.0,
      },
      {
        "tag": "semiconductor",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "data_center",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "SWKS",
    "sourceSection": "Tech",
    "primaryCategory": "semiconductor",
    "displayTags": [
      "AI",
      "Semiconductor",
      "High Growth",
      "Data Center"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "ai",
        "weight": 1.0,
      },
      {
        "tag": "semiconductor",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "data_center",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "SMCI",
    "sourceSection": "Tech",
    "primaryCategory": "semiconductor",
    "displayTags": [
      "AI",
      "Semiconductor",
      "High Growth",
      "Data Center"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "ai",
        "weight": 1.0,
      },
      {
        "tag": "semiconductor",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "data_center",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "BABA",
    "sourceSection": "Tech",
    "primaryCategory": "ecommerce_marketplace",
    "displayTags": [
      "E-Commerce",
      "Marketplace",
      "Consumer Brand",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "ecommerce",
        "weight": 1.0,
      },
      {
        "tag": "marketplace",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "BIDU",
    "sourceSection": "Tech",
    "primaryCategory": "ecommerce_marketplace",
    "displayTags": [
      "E-Commerce",
      "Marketplace",
      "Consumer Brand",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "ecommerce",
        "weight": 1.0,
      },
      {
        "tag": "marketplace",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "JD",
    "sourceSection": "Tech",
    "primaryCategory": "ecommerce_marketplace",
    "displayTags": [
      "E-Commerce",
      "Marketplace",
      "Consumer Brand",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "ecommerce",
        "weight": 1.0,
      },
      {
        "tag": "marketplace",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "WEX",
    "sourceSection": "Tech",
    "primaryCategory": "fintech_payments",
    "displayTags": [
      "Fintech",
      "Payments",
      "Consumer Finance",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "fintech",
        "weight": 1.0,
      },
      {
        "tag": "payments",
        "weight": 1.0,
      },
      {
        "tag": "consumer_finance",
        "weight": 0.75,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "U",
    "sourceSection": "Tech",
    "primaryCategory": "gaming",
    "displayTags": [
      "Gaming",
      "Entertainment",
      "Consumer Platform",
      "Digital Media"
    ],
    "learningTags": [
      {
        "tag": "gaming",
        "weight": 1.0,
      },
      {
        "tag": "entertainment",
        "weight": 0.75,
      },
      {
        "tag": "consumer_platform",
        "weight": 0.75,
      },
      {
        "tag": "digital_media",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "TOST",
    "sourceSection": "Tech",
    "primaryCategory": "fintech_payments",
    "displayTags": [
      "Fintech",
      "Payments",
      "Consumer Finance",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "fintech",
        "weight": 1.0,
      },
      {
        "tag": "payments",
        "weight": 1.0,
      },
      {
        "tag": "consumer_finance",
        "weight": 0.75,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "NCNO",
    "sourceSection": "Tech",
    "primaryCategory": "fintech_payments",
    "displayTags": [
      "Fintech",
      "Payments",
      "Consumer Finance",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "fintech",
        "weight": 1.0,
      },
      {
        "tag": "payments",
        "weight": 1.0,
      },
      {
        "tag": "consumer_finance",
        "weight": 0.75,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "UPST",
    "sourceSection": "Tech",
    "primaryCategory": "fintech_payments",
    "displayTags": [
      "Fintech",
      "Payments",
      "Consumer Finance",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "fintech",
        "weight": 1.0,
      },
      {
        "tag": "payments",
        "weight": 1.0,
      },
      {
        "tag": "consumer_finance",
        "weight": 0.75,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "MCHP",
    "sourceSection": "Tech",
    "primaryCategory": "semiconductor",
    "displayTags": [
      "AI",
      "Semiconductor",
      "High Growth",
      "Data Center"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "ai",
        "weight": 1.0,
      },
      {
        "tag": "semiconductor",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "data_center",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "LRCX",
    "sourceSection": "Tech",
    "primaryCategory": "semiconductor_equipment",
    "displayTags": [
      "Semiconductor",
      "Chip Equipment",
      "AI Supply Chain",
      "Cyclical"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "semiconductor",
        "weight": 1.0,
      },
      {
        "tag": "chip_equipment",
        "weight": 0.75,
      },
      {
        "tag": "ai_supply_chain",
        "weight": 0.75,
      },
      {
        "tag": "cyclical",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "PFE",
    "sourceSection": "Healthcare",
    "primaryCategory": "healthcare_pharma",
    "displayTags": [
      "Healthcare",
      "Pharma",
      "Defensive",
      "Pipeline"
    ],
    "learningTags": [
      {
        "tag": "healthcare",
        "weight": 1.0,
      },
      {
        "tag": "pharma",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "drug_pipeline",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "MRNA",
    "sourceSection": "Healthcare",
    "primaryCategory": "biotech",
    "displayTags": [
      "Biotech",
      "Healthcare",
      "Pipeline",
      "Speculative"
    ],
    "learningTags": [
      {
        "tag": "healthcare",
        "weight": 1.0,
      },
      {
        "tag": "biotech",
        "weight": 1.0,
      },
      {
        "tag": "drug_pipeline",
        "weight": 0.75,
      },
      {
        "tag": "speculative",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "BMY",
    "sourceSection": "Healthcare",
    "primaryCategory": "healthcare_pharma",
    "displayTags": [
      "Healthcare",
      "Pharma",
      "Defensive",
      "Pipeline"
    ],
    "learningTags": [
      {
        "tag": "healthcare",
        "weight": 1.0,
      },
      {
        "tag": "pharma",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "drug_pipeline",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "LLY",
    "sourceSection": "Healthcare",
    "primaryCategory": "healthcare_pharma",
    "displayTags": [
      "Healthcare",
      "Pharma",
      "Defensive",
      "Pipeline"
    ],
    "learningTags": [
      {
        "tag": "healthcare",
        "weight": 1.0,
      },
      {
        "tag": "pharma",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "drug_pipeline",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "ABBV",
    "sourceSection": "Healthcare",
    "primaryCategory": "healthcare_pharma",
    "displayTags": [
      "Healthcare",
      "Pharma",
      "Defensive",
      "Pipeline"
    ],
    "learningTags": [
      {
        "tag": "healthcare",
        "weight": 1.0,
      },
      {
        "tag": "pharma",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "drug_pipeline",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "MRK",
    "sourceSection": "Healthcare",
    "primaryCategory": "healthcare_pharma",
    "displayTags": [
      "Healthcare",
      "Pharma",
      "Defensive",
      "Pipeline"
    ],
    "learningTags": [
      {
        "tag": "healthcare",
        "weight": 1.0,
      },
      {
        "tag": "pharma",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "drug_pipeline",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "GILD",
    "sourceSection": "Healthcare",
    "primaryCategory": "healthcare_pharma",
    "displayTags": [
      "Healthcare",
      "Pharma",
      "Defensive",
      "Pipeline"
    ],
    "learningTags": [
      {
        "tag": "healthcare",
        "weight": 1.0,
      },
      {
        "tag": "pharma",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "drug_pipeline",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "AMGN",
    "sourceSection": "Healthcare",
    "primaryCategory": "healthcare_pharma",
    "displayTags": [
      "Healthcare",
      "Pharma",
      "Defensive",
      "Pipeline"
    ],
    "learningTags": [
      {
        "tag": "healthcare",
        "weight": 1.0,
      },
      {
        "tag": "pharma",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "drug_pipeline",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "REGN",
    "sourceSection": "Healthcare",
    "primaryCategory": "biotech",
    "displayTags": [
      "Biotech",
      "Healthcare",
      "Pipeline",
      "Speculative"
    ],
    "learningTags": [
      {
        "tag": "healthcare",
        "weight": 1.0,
      },
      {
        "tag": "biotech",
        "weight": 1.0,
      },
      {
        "tag": "drug_pipeline",
        "weight": 0.75,
      },
      {
        "tag": "speculative",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "VRTX",
    "sourceSection": "Healthcare",
    "primaryCategory": "biotech",
    "displayTags": [
      "Biotech",
      "Healthcare",
      "Pipeline",
      "Speculative"
    ],
    "learningTags": [
      {
        "tag": "healthcare",
        "weight": 1.0,
      },
      {
        "tag": "biotech",
        "weight": 1.0,
      },
      {
        "tag": "drug_pipeline",
        "weight": 0.75,
      },
      {
        "tag": "speculative",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "BIIB",
    "sourceSection": "Healthcare",
    "primaryCategory": "biotech",
    "displayTags": [
      "Biotech",
      "Healthcare",
      "Pipeline",
      "Speculative"
    ],
    "learningTags": [
      {
        "tag": "healthcare",
        "weight": 1.0,
      },
      {
        "tag": "biotech",
        "weight": 1.0,
      },
      {
        "tag": "drug_pipeline",
        "weight": 0.75,
      },
      {
        "tag": "speculative",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "ISRG",
    "sourceSection": "Healthcare",
    "primaryCategory": "medical_devices",
    "displayTags": [
      "Medical Devices",
      "Healthcare",
      "Innovation",
      "Defensive"
    ],
    "learningTags": [
      {
        "tag": "healthcare",
        "weight": 1.0,
      },
      {
        "tag": "medical_devices",
        "weight": 1.0,
      },
      {
        "tag": "innovation",
        "weight": 0.75,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "MDT",
    "sourceSection": "Healthcare",
    "primaryCategory": "medical_devices",
    "displayTags": [
      "Medical Devices",
      "Healthcare",
      "Innovation",
      "Defensive"
    ],
    "learningTags": [
      {
        "tag": "healthcare",
        "weight": 1.0,
      },
      {
        "tag": "medical_devices",
        "weight": 1.0,
      },
      {
        "tag": "innovation",
        "weight": 0.75,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "SYK",
    "sourceSection": "Healthcare",
    "primaryCategory": "medical_devices",
    "displayTags": [
      "Medical Devices",
      "Healthcare",
      "Innovation",
      "Defensive"
    ],
    "learningTags": [
      {
        "tag": "healthcare",
        "weight": 1.0,
      },
      {
        "tag": "medical_devices",
        "weight": 1.0,
      },
      {
        "tag": "innovation",
        "weight": 0.75,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "BSX",
    "sourceSection": "Healthcare",
    "primaryCategory": "medical_devices",
    "displayTags": [
      "Medical Devices",
      "Healthcare",
      "Innovation",
      "Defensive"
    ],
    "learningTags": [
      {
        "tag": "healthcare",
        "weight": 1.0,
      },
      {
        "tag": "medical_devices",
        "weight": 1.0,
      },
      {
        "tag": "innovation",
        "weight": 0.75,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "CVS",
    "sourceSection": "Healthcare",
    "primaryCategory": "health_insurance",
    "displayTags": [
      "Health Insurance",
      "Healthcare",
      "Defensive",
      "Managed Care"
    ],
    "learningTags": [
      {
        "tag": "healthcare",
        "weight": 1.0,
      },
      {
        "tag": "insurance",
        "weight": 1.0,
      },
      {
        "tag": "managed_care",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "CI",
    "sourceSection": "Healthcare",
    "primaryCategory": "health_insurance",
    "displayTags": [
      "Health Insurance",
      "Healthcare",
      "Defensive",
      "Managed Care"
    ],
    "learningTags": [
      {
        "tag": "healthcare",
        "weight": 1.0,
      },
      {
        "tag": "insurance",
        "weight": 1.0,
      },
      {
        "tag": "managed_care",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "HUM",
    "sourceSection": "Healthcare",
    "primaryCategory": "health_insurance",
    "displayTags": [
      "Health Insurance",
      "Healthcare",
      "Defensive",
      "Managed Care"
    ],
    "learningTags": [
      {
        "tag": "healthcare",
        "weight": 1.0,
      },
      {
        "tag": "insurance",
        "weight": 1.0,
      },
      {
        "tag": "managed_care",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "HIMS",
    "sourceSection": "Healthcare",
    "primaryCategory": "digital_health",
    "displayTags": [
      "Digital Health",
      "Consumer Health",
      "High Growth",
      "Speculative"
    ],
    "learningTags": [
      {
        "tag": "healthcare",
        "weight": 1.0,
      },
      {
        "tag": "digital_health",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "speculative",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "HOLX",
    "sourceSection": "Healthcare",
    "primaryCategory": "medical_devices",
    "displayTags": [
      "Medical Devices",
      "Healthcare",
      "Innovation",
      "Defensive"
    ],
    "learningTags": [
      {
        "tag": "healthcare",
        "weight": 1.0,
      },
      {
        "tag": "medical_devices",
        "weight": 1.0,
      },
      {
        "tag": "innovation",
        "weight": 0.75,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "RMD",
    "sourceSection": "Healthcare",
    "primaryCategory": "medical_devices",
    "displayTags": [
      "Medical Devices",
      "Healthcare",
      "Innovation",
      "Defensive"
    ],
    "learningTags": [
      {
        "tag": "healthcare",
        "weight": 1.0,
      },
      {
        "tag": "medical_devices",
        "weight": 1.0,
      },
      {
        "tag": "innovation",
        "weight": 0.75,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "NVO",
    "sourceSection": "Healthcare",
    "primaryCategory": "healthcare_pharma",
    "displayTags": [
      "Healthcare",
      "Pharma",
      "Defensive",
      "Pipeline"
    ],
    "learningTags": [
      {
        "tag": "healthcare",
        "weight": 1.0,
      },
      {
        "tag": "pharma",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "drug_pipeline",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "CMG",
    "sourceSection": "Consumer",
    "primaryCategory": "restaurant",
    "displayTags": [
      "Consumer Brand",
      "Restaurant",
      "Familiar Brand",
      "Everyday Spending"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "restaurant",
        "weight": 1.0,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "YUM",
    "sourceSection": "Consumer",
    "primaryCategory": "restaurant",
    "displayTags": [
      "Consumer Brand",
      "Restaurant",
      "Familiar Brand",
      "Everyday Spending"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "restaurant",
        "weight": 1.0,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "DPZ",
    "sourceSection": "Consumer",
    "primaryCategory": "restaurant",
    "displayTags": [
      "Consumer Brand",
      "Restaurant",
      "Familiar Brand",
      "Everyday Spending"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "restaurant",
        "weight": 1.0,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "F",
    "sourceSection": "Consumer",
    "primaryCategory": "auto_legacy",
    "displayTags": [
      "Auto",
      "Industrial Consumer",
      "Cyclical",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "auto",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "industrial",
        "weight": 0.75,
      },
      {
        "tag": "cyclical",
        "weight": 0.5,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "GM",
    "sourceSection": "Consumer",
    "primaryCategory": "auto_legacy",
    "displayTags": [
      "Auto",
      "Industrial Consumer",
      "Cyclical",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "auto",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "industrial",
        "weight": 0.75,
      },
      {
        "tag": "cyclical",
        "weight": 0.5,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "RIVN",
    "sourceSection": "Consumer",
    "primaryCategory": "auto_ev",
    "displayTags": [
      "EV/Auto",
      "Consumer Brand",
      "High Growth",
      "Speculative"
    ],
    "learningTags": [
      {
        "tag": "electric_vehicles",
        "weight": 1.0,
      },
      {
        "tag": "auto",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "speculative",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "LULU",
    "sourceSection": "Consumer",
    "primaryCategory": "apparel_beauty",
    "displayTags": [
      "Consumer Brand",
      "Apparel/Beauty",
      "Retail",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "apparel_beauty",
        "weight": 1.0,
      },
      {
        "tag": "retail",
        "weight": 1.0,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "TJX",
    "sourceSection": "Consumer",
    "primaryCategory": "retail",
    "displayTags": [
      "Retail",
      "Consumer Brand",
      "Everyday Spending",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "retail",
        "weight": 1.0,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "ROST",
    "sourceSection": "Consumer",
    "primaryCategory": "retail",
    "displayTags": [
      "Retail",
      "Consumer Brand",
      "Everyday Spending",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "retail",
        "weight": 1.0,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "ORLY",
    "sourceSection": "Consumer",
    "primaryCategory": "retail",
    "displayTags": [
      "Retail",
      "Consumer Brand",
      "Everyday Spending",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "retail",
        "weight": 1.0,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "AZO",
    "sourceSection": "Consumer",
    "primaryCategory": "retail",
    "displayTags": [
      "Retail",
      "Consumer Brand",
      "Everyday Spending",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "retail",
        "weight": 1.0,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "TSCO",
    "sourceSection": "Consumer",
    "primaryCategory": "retail",
    "displayTags": [
      "Retail",
      "Consumer Brand",
      "Everyday Spending",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "retail",
        "weight": 1.0,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "DLTR",
    "sourceSection": "Consumer",
    "primaryCategory": "retail",
    "displayTags": [
      "Retail",
      "Consumer Brand",
      "Everyday Spending",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "retail",
        "weight": 1.0,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "DG",
    "sourceSection": "Consumer",
    "primaryCategory": "retail",
    "displayTags": [
      "Retail",
      "Consumer Brand",
      "Everyday Spending",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "retail",
        "weight": 1.0,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "BURL",
    "sourceSection": "Consumer",
    "primaryCategory": "retail",
    "displayTags": [
      "Retail",
      "Consumer Brand",
      "Everyday Spending",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "retail",
        "weight": 1.0,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "MAR",
    "sourceSection": "Consumer",
    "primaryCategory": "travel_rideshare",
    "displayTags": [
      "Travel",
      "Mobility",
      "Consumer App",
      "Marketplace"
    ],
    "learningTags": [
      {
        "tag": "travel",
        "weight": 1.0,
      },
      {
        "tag": "mobility",
        "weight": 0.75,
      },
      {
        "tag": "consumer_platform",
        "weight": 0.75,
      },
      {
        "tag": "marketplace",
        "weight": 1.0,
      },
      {
        "tag": "gig_economy",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "HLT",
    "sourceSection": "Consumer",
    "primaryCategory": "travel_rideshare",
    "displayTags": [
      "Travel",
      "Mobility",
      "Consumer App",
      "Marketplace"
    ],
    "learningTags": [
      {
        "tag": "travel",
        "weight": 1.0,
      },
      {
        "tag": "mobility",
        "weight": 0.75,
      },
      {
        "tag": "consumer_platform",
        "weight": 0.75,
      },
      {
        "tag": "marketplace",
        "weight": 1.0,
      },
      {
        "tag": "gig_economy",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "RCL",
    "sourceSection": "Consumer",
    "primaryCategory": "travel_rideshare",
    "displayTags": [
      "Travel",
      "Mobility",
      "Consumer App",
      "Marketplace"
    ],
    "learningTags": [
      {
        "tag": "travel",
        "weight": 1.0,
      },
      {
        "tag": "mobility",
        "weight": 0.75,
      },
      {
        "tag": "consumer_platform",
        "weight": 0.75,
      },
      {
        "tag": "marketplace",
        "weight": 1.0,
      },
      {
        "tag": "gig_economy",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "ETSY",
    "sourceSection": "Consumer",
    "primaryCategory": "ecommerce_marketplace",
    "displayTags": [
      "E-Commerce",
      "Marketplace",
      "Consumer Brand",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "ecommerce",
        "weight": 1.0,
      },
      {
        "tag": "marketplace",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "EOG",
    "sourceSection": "Energy",
    "primaryCategory": "energy_oilgas",
    "displayTags": [
      "Energy",
      "Oil & Gas",
      "Commodity",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "energy",
        "weight": 1.0,
      },
      {
        "tag": "oil_gas",
        "weight": 1.0,
      },
      {
        "tag": "commodity_sensitive",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "OXY",
    "sourceSection": "Energy",
    "primaryCategory": "energy_oilgas",
    "displayTags": [
      "Energy",
      "Oil & Gas",
      "Commodity",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "energy",
        "weight": 1.0,
      },
      {
        "tag": "oil_gas",
        "weight": 1.0,
      },
      {
        "tag": "commodity_sensitive",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "HAL",
    "sourceSection": "Energy",
    "primaryCategory": "energy_oilgas",
    "displayTags": [
      "Energy",
      "Oil & Gas",
      "Commodity",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "energy",
        "weight": 1.0,
      },
      {
        "tag": "oil_gas",
        "weight": 1.0,
      },
      {
        "tag": "commodity_sensitive",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "SLB",
    "sourceSection": "Energy",
    "primaryCategory": "energy_oilgas",
    "displayTags": [
      "Energy",
      "Oil & Gas",
      "Commodity",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "energy",
        "weight": 1.0,
      },
      {
        "tag": "oil_gas",
        "weight": 1.0,
      },
      {
        "tag": "commodity_sensitive",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "PSX",
    "sourceSection": "Energy",
    "primaryCategory": "energy_oilgas",
    "displayTags": [
      "Energy",
      "Oil & Gas",
      "Commodity",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "energy",
        "weight": 1.0,
      },
      {
        "tag": "oil_gas",
        "weight": 1.0,
      },
      {
        "tag": "commodity_sensitive",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "VLO",
    "sourceSection": "Energy",
    "primaryCategory": "energy_oilgas",
    "displayTags": [
      "Energy",
      "Oil & Gas",
      "Commodity",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "energy",
        "weight": 1.0,
      },
      {
        "tag": "oil_gas",
        "weight": 1.0,
      },
      {
        "tag": "commodity_sensitive",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "KMI",
    "sourceSection": "Energy",
    "primaryCategory": "energy_oilgas",
    "displayTags": [
      "Energy",
      "Oil & Gas",
      "Commodity",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "energy",
        "weight": 1.0,
      },
      {
        "tag": "oil_gas",
        "weight": 1.0,
      },
      {
        "tag": "commodity_sensitive",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "DVN",
    "sourceSection": "Energy",
    "primaryCategory": "energy_oilgas",
    "displayTags": [
      "Energy",
      "Oil & Gas",
      "Commodity",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "energy",
        "weight": 1.0,
      },
      {
        "tag": "oil_gas",
        "weight": 1.0,
      },
      {
        "tag": "commodity_sensitive",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "HES",
    "sourceSection": "Energy",
    "primaryCategory": "energy_oilgas",
    "displayTags": [
      "Energy",
      "Oil & Gas",
      "Commodity",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "energy",
        "weight": 1.0,
      },
      {
        "tag": "oil_gas",
        "weight": 1.0,
      },
      {
        "tag": "commodity_sensitive",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "BKR",
    "sourceSection": "Energy",
    "primaryCategory": "energy_oilgas",
    "displayTags": [
      "Energy",
      "Oil & Gas",
      "Commodity",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "energy",
        "weight": 1.0,
      },
      {
        "tag": "oil_gas",
        "weight": 1.0,
      },
      {
        "tag": "commodity_sensitive",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "CAT",
    "sourceSection": "Industrial / Aerospace / Transport",
    "primaryCategory": "industrial",
    "displayTags": [
      "Industrial",
      "Infrastructure",
      "Cyclical",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "industrials",
        "weight": 1.0,
      },
      {
        "tag": "infrastructure",
        "weight": 0.75,
      },
      {
        "tag": "cyclical",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "DE",
    "sourceSection": "Industrial / Aerospace / Transport",
    "primaryCategory": "industrial",
    "displayTags": [
      "Industrial",
      "Infrastructure",
      "Cyclical",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "industrials",
        "weight": 1.0,
      },
      {
        "tag": "infrastructure",
        "weight": 0.75,
      },
      {
        "tag": "cyclical",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "ETN",
    "sourceSection": "Industrial / Aerospace / Transport",
    "primaryCategory": "industrial",
    "displayTags": [
      "Industrial",
      "Infrastructure",
      "Cyclical",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "industrials",
        "weight": 1.0,
      },
      {
        "tag": "infrastructure",
        "weight": 0.75,
      },
      {
        "tag": "cyclical",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "EMR",
    "sourceSection": "Industrial / Aerospace / Transport",
    "primaryCategory": "industrial",
    "displayTags": [
      "Industrial",
      "Infrastructure",
      "Cyclical",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "industrials",
        "weight": 1.0,
      },
      {
        "tag": "infrastructure",
        "weight": 0.75,
      },
      {
        "tag": "cyclical",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "ITW",
    "sourceSection": "Industrial / Aerospace / Transport",
    "primaryCategory": "industrial",
    "displayTags": [
      "Industrial",
      "Infrastructure",
      "Cyclical",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "industrials",
        "weight": 1.0,
      },
      {
        "tag": "infrastructure",
        "weight": 0.75,
      },
      {
        "tag": "cyclical",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "IR",
    "sourceSection": "Industrial / Aerospace / Transport",
    "primaryCategory": "industrial",
    "displayTags": [
      "Industrial",
      "Infrastructure",
      "Cyclical",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "industrials",
        "weight": 1.0,
      },
      {
        "tag": "infrastructure",
        "weight": 0.75,
      },
      {
        "tag": "cyclical",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "RTX",
    "sourceSection": "Industrial / Aerospace / Transport",
    "primaryCategory": "aerospace_defense",
    "displayTags": [
      "Aerospace/Defense",
      "Industrial",
      "Government Contracts",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "industrials",
        "weight": 1.0,
      },
      {
        "tag": "aerospace_defense",
        "weight": 1.0,
      },
      {
        "tag": "government_contracts",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "NOC",
    "sourceSection": "Industrial / Aerospace / Transport",
    "primaryCategory": "aerospace_defense",
    "displayTags": [
      "Aerospace/Defense",
      "Industrial",
      "Government Contracts",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "industrials",
        "weight": 1.0,
      },
      {
        "tag": "aerospace_defense",
        "weight": 1.0,
      },
      {
        "tag": "government_contracts",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "LHX",
    "sourceSection": "Industrial / Aerospace / Transport",
    "primaryCategory": "aerospace_defense",
    "displayTags": [
      "Aerospace/Defense",
      "Industrial",
      "Government Contracts",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "industrials",
        "weight": 1.0,
      },
      {
        "tag": "aerospace_defense",
        "weight": 1.0,
      },
      {
        "tag": "government_contracts",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "GE",
    "sourceSection": "Industrial / Aerospace / Transport",
    "primaryCategory": "aerospace_defense",
    "displayTags": [
      "Aerospace/Defense",
      "Industrial",
      "Government Contracts",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "industrials",
        "weight": 1.0,
      },
      {
        "tag": "aerospace_defense",
        "weight": 1.0,
      },
      {
        "tag": "government_contracts",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "MMM",
    "sourceSection": "Industrial / Aerospace / Transport",
    "primaryCategory": "industrial",
    "displayTags": [
      "Industrial",
      "Infrastructure",
      "Cyclical",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "industrials",
        "weight": 1.0,
      },
      {
        "tag": "infrastructure",
        "weight": 0.75,
      },
      {
        "tag": "cyclical",
        "weight": 0.5,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "UNP",
    "sourceSection": "Industrial / Aerospace / Transport",
    "primaryCategory": "transport_logistics",
    "displayTags": [
      "Transportation",
      "Logistics",
      "Cyclical",
      "Industrial"
    ],
    "learningTags": [
      {
        "tag": "transportation",
        "weight": 1.0,
      },
      {
        "tag": "logistics",
        "weight": 1.0,
      },
      {
        "tag": "cyclical",
        "weight": 0.5,
      },
      {
        "tag": "industrials",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "CSX",
    "sourceSection": "Industrial / Aerospace / Transport",
    "primaryCategory": "transport_logistics",
    "displayTags": [
      "Transportation",
      "Logistics",
      "Cyclical",
      "Industrial"
    ],
    "learningTags": [
      {
        "tag": "transportation",
        "weight": 1.0,
      },
      {
        "tag": "logistics",
        "weight": 1.0,
      },
      {
        "tag": "cyclical",
        "weight": 0.5,
      },
      {
        "tag": "industrials",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "UPS",
    "sourceSection": "Industrial / Aerospace / Transport",
    "primaryCategory": "transport_logistics",
    "displayTags": [
      "Transportation",
      "Logistics",
      "Cyclical",
      "Industrial"
    ],
    "learningTags": [
      {
        "tag": "transportation",
        "weight": 1.0,
      },
      {
        "tag": "logistics",
        "weight": 1.0,
      },
      {
        "tag": "cyclical",
        "weight": 0.5,
      },
      {
        "tag": "industrials",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "FDX",
    "sourceSection": "Industrial / Aerospace / Transport",
    "primaryCategory": "transport_logistics",
    "displayTags": [
      "Transportation",
      "Logistics",
      "Cyclical",
      "Industrial"
    ],
    "learningTags": [
      {
        "tag": "transportation",
        "weight": 1.0,
      },
      {
        "tag": "logistics",
        "weight": 1.0,
      },
      {
        "tag": "cyclical",
        "weight": 0.5,
      },
      {
        "tag": "industrials",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "DAL",
    "sourceSection": "Industrial / Aerospace / Transport",
    "primaryCategory": "airline",
    "displayTags": [
      "Airline",
      "Travel",
      "Cyclical",
      "Consumer"
    ],
    "learningTags": [
      {
        "tag": "travel",
        "weight": 1.0,
      },
      {
        "tag": "airline",
        "weight": 1.0,
      },
      {
        "tag": "cyclical",
        "weight": 0.5,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "UAL",
    "sourceSection": "Industrial / Aerospace / Transport",
    "primaryCategory": "airline",
    "displayTags": [
      "Airline",
      "Travel",
      "Cyclical",
      "Consumer"
    ],
    "learningTags": [
      {
        "tag": "travel",
        "weight": 1.0,
      },
      {
        "tag": "airline",
        "weight": 1.0,
      },
      {
        "tag": "cyclical",
        "weight": 0.5,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "LUV",
    "sourceSection": "Industrial / Aerospace / Transport",
    "primaryCategory": "airline",
    "displayTags": [
      "Airline",
      "Travel",
      "Cyclical",
      "Consumer"
    ],
    "learningTags": [
      {
        "tag": "travel",
        "weight": 1.0,
      },
      {
        "tag": "airline",
        "weight": 1.0,
      },
      {
        "tag": "cyclical",
        "weight": 0.5,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "AAL",
    "sourceSection": "Industrial / Aerospace / Transport",
    "primaryCategory": "airline",
    "displayTags": [
      "Airline",
      "Travel",
      "Cyclical",
      "Consumer"
    ],
    "learningTags": [
      {
        "tag": "travel",
        "weight": 1.0,
      },
      {
        "tag": "airline",
        "weight": 1.0,
      },
      {
        "tag": "cyclical",
        "weight": 0.5,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "T",
    "sourceSection": "Telecom",
    "primaryCategory": "telecom",
    "displayTags": [
      "Telecom",
      "Dividend",
      "Consumer Service",
      "Defensive"
    ],
    "learningTags": [
      {
        "tag": "telecom",
        "weight": 1.0,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      },
      {
        "tag": "consumer_service",
        "weight": 0.75,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "VZ",
    "sourceSection": "Telecom",
    "primaryCategory": "telecom",
    "displayTags": [
      "Telecom",
      "Dividend",
      "Consumer Service",
      "Defensive"
    ],
    "learningTags": [
      {
        "tag": "telecom",
        "weight": 1.0,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      },
      {
        "tag": "consumer_service",
        "weight": 0.75,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "TMUS",
    "sourceSection": "Telecom",
    "primaryCategory": "telecom",
    "displayTags": [
      "Telecom",
      "Dividend",
      "Consumer Service",
      "Defensive"
    ],
    "learningTags": [
      {
        "tag": "telecom",
        "weight": 1.0,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      },
      {
        "tag": "consumer_service",
        "weight": 0.75,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "DUK",
    "sourceSection": "Utilities",
    "primaryCategory": "utilities",
    "displayTags": [
      "Utilities",
      "Dividend",
      "Defensive",
      "Rate Sensitive"
    ],
    "learningTags": [
      {
        "tag": "utilities",
        "weight": 1.0,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "interest_rate_sensitive",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "SO",
    "sourceSection": "Utilities",
    "primaryCategory": "utilities",
    "displayTags": [
      "Utilities",
      "Dividend",
      "Defensive",
      "Rate Sensitive"
    ],
    "learningTags": [
      {
        "tag": "utilities",
        "weight": 1.0,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "interest_rate_sensitive",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "D",
    "sourceSection": "Utilities",
    "primaryCategory": "utilities",
    "displayTags": [
      "Utilities",
      "Dividend",
      "Defensive",
      "Rate Sensitive"
    ],
    "learningTags": [
      {
        "tag": "utilities",
        "weight": 1.0,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "interest_rate_sensitive",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "AEP",
    "sourceSection": "Utilities",
    "primaryCategory": "utilities",
    "displayTags": [
      "Utilities",
      "Dividend",
      "Defensive",
      "Rate Sensitive"
    ],
    "learningTags": [
      {
        "tag": "utilities",
        "weight": 1.0,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "interest_rate_sensitive",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "EXC",
    "sourceSection": "Utilities",
    "primaryCategory": "utilities",
    "displayTags": [
      "Utilities",
      "Dividend",
      "Defensive",
      "Rate Sensitive"
    ],
    "learningTags": [
      {
        "tag": "utilities",
        "weight": 1.0,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "interest_rate_sensitive",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "O",
    "sourceSection": "REITs",
    "primaryCategory": "reit",
    "displayTags": [
      "Real Estate",
      "REIT",
      "Dividend",
      "Income"
    ],
    "learningTags": [
      {
        "tag": "real_estate",
        "weight": 1.0,
      },
      {
        "tag": "reit",
        "weight": 1.0,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      },
      {
        "tag": "income",
        "weight": 0.75,
      },
      {
        "tag": "interest_rate_sensitive",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "AMT",
    "sourceSection": "REITs",
    "primaryCategory": "reit",
    "displayTags": [
      "Real Estate",
      "REIT",
      "Dividend",
      "Income"
    ],
    "learningTags": [
      {
        "tag": "real_estate",
        "weight": 1.0,
      },
      {
        "tag": "reit",
        "weight": 1.0,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      },
      {
        "tag": "income",
        "weight": 0.75,
      },
      {
        "tag": "interest_rate_sensitive",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "EQIX",
    "sourceSection": "REITs",
    "primaryCategory": "reit",
    "displayTags": [
      "Real Estate",
      "REIT",
      "Dividend",
      "Income"
    ],
    "learningTags": [
      {
        "tag": "real_estate",
        "weight": 1.0,
      },
      {
        "tag": "reit",
        "weight": 1.0,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      },
      {
        "tag": "income",
        "weight": 0.75,
      },
      {
        "tag": "interest_rate_sensitive",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "SPG",
    "sourceSection": "REITs",
    "primaryCategory": "reit",
    "displayTags": [
      "Real Estate",
      "REIT",
      "Dividend",
      "Income"
    ],
    "learningTags": [
      {
        "tag": "real_estate",
        "weight": 1.0,
      },
      {
        "tag": "reit",
        "weight": 1.0,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      },
      {
        "tag": "income",
        "weight": 0.75,
      },
      {
        "tag": "interest_rate_sensitive",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "PLD",
    "sourceSection": "REITs",
    "primaryCategory": "reit",
    "displayTags": [
      "Real Estate",
      "REIT",
      "Dividend",
      "Income"
    ],
    "learningTags": [
      {
        "tag": "real_estate",
        "weight": 1.0,
      },
      {
        "tag": "reit",
        "weight": 1.0,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      },
      {
        "tag": "income",
        "weight": 0.75,
      },
      {
        "tag": "interest_rate_sensitive",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "DLR",
    "sourceSection": "REITs",
    "primaryCategory": "reit",
    "displayTags": [
      "Real Estate",
      "REIT",
      "Dividend",
      "Income"
    ],
    "learningTags": [
      {
        "tag": "real_estate",
        "weight": 1.0,
      },
      {
        "tag": "reit",
        "weight": 1.0,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      },
      {
        "tag": "income",
        "weight": 0.75,
      },
      {
        "tag": "interest_rate_sensitive",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "WBD",
    "sourceSection": "Media / Gaming",
    "primaryCategory": "streaming_media",
    "displayTags": [
      "Streaming",
      "Entertainment",
      "Consumer Brand",
      "Subscriptions"
    ],
    "learningTags": [
      {
        "tag": "streaming",
        "weight": 1.0,
      },
      {
        "tag": "entertainment",
        "weight": 0.75,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "subscription",
        "weight": 0.75,
      },
      {
        "tag": "media",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "MGM",
    "sourceSection": "Media / Gaming",
    "primaryCategory": "casino_entertainment",
    "displayTags": [
      "Casino/Gaming",
      "Travel",
      "Entertainment",
      "Consumer"
    ],
    "learningTags": [
      {
        "tag": "casino_gaming",
        "weight": 1.0,
      },
      {
        "tag": "travel",
        "weight": 1.0,
      },
      {
        "tag": "entertainment",
        "weight": 0.75,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "CZR",
    "sourceSection": "Media / Gaming",
    "primaryCategory": "casino_entertainment",
    "displayTags": [
      "Casino/Gaming",
      "Travel",
      "Entertainment",
      "Consumer"
    ],
    "learningTags": [
      {
        "tag": "casino_gaming",
        "weight": 1.0,
      },
      {
        "tag": "travel",
        "weight": 1.0,
      },
      {
        "tag": "entertainment",
        "weight": 0.75,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "EA",
    "sourceSection": "Media / Gaming",
    "primaryCategory": "gaming",
    "displayTags": [
      "Gaming",
      "Entertainment",
      "Consumer Platform",
      "Digital Media"
    ],
    "learningTags": [
      {
        "tag": "gaming",
        "weight": 1.0,
      },
      {
        "tag": "entertainment",
        "weight": 0.75,
      },
      {
        "tag": "consumer_platform",
        "weight": 0.75,
      },
      {
        "tag": "digital_media",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "TTWO",
    "sourceSection": "Media / Gaming",
    "primaryCategory": "gaming",
    "displayTags": [
      "Gaming",
      "Entertainment",
      "Consumer Platform",
      "Digital Media"
    ],
    "learningTags": [
      {
        "tag": "gaming",
        "weight": 1.0,
      },
      {
        "tag": "entertainment",
        "weight": 0.75,
      },
      {
        "tag": "consumer_platform",
        "weight": 0.75,
      },
      {
        "tag": "digital_media",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "TTD",
    "sourceSection": "Media / Gaming",
    "primaryCategory": "adtech",
    "displayTags": [
      "Ad Tech",
      "Digital Ads",
      "Software",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "digital_ads",
        "weight": 0.75,
      },
      {
        "tag": "adtech",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "ROKU",
    "sourceSection": "Media / Gaming",
    "primaryCategory": "streaming_media",
    "displayTags": [
      "Streaming",
      "Entertainment",
      "Consumer Brand",
      "Subscriptions"
    ],
    "learningTags": [
      {
        "tag": "streaming",
        "weight": 1.0,
      },
      {
        "tag": "entertainment",
        "weight": 0.75,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "subscription",
        "weight": 0.75,
      },
      {
        "tag": "media",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "MSTR",
    "sourceSection": "Crypto",
    "primaryCategory": "crypto_fintech",
    "displayTags": [
      "Crypto",
      "Fintech",
      "Trading Platform",
      "Speculative"
    ],
    "learningTags": [
      {
        "tag": "crypto",
        "weight": 1.0,
      },
      {
        "tag": "fintech",
        "weight": 1.0,
      },
      {
        "tag": "trading_platform",
        "weight": 1.0,
      },
      {
        "tag": "speculative",
        "weight": 0.75,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "MARA",
    "sourceSection": "Crypto",
    "primaryCategory": "crypto_fintech",
    "displayTags": [
      "Crypto",
      "Fintech",
      "Trading Platform",
      "Speculative"
    ],
    "learningTags": [
      {
        "tag": "crypto",
        "weight": 1.0,
      },
      {
        "tag": "fintech",
        "weight": 1.0,
      },
      {
        "tag": "trading_platform",
        "weight": 1.0,
      },
      {
        "tag": "speculative",
        "weight": 0.75,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "RIOT",
    "sourceSection": "Crypto",
    "primaryCategory": "crypto_fintech",
    "displayTags": [
      "Crypto",
      "Fintech",
      "Trading Platform",
      "Speculative"
    ],
    "learningTags": [
      {
        "tag": "crypto",
        "weight": 1.0,
      },
      {
        "tag": "fintech",
        "weight": 1.0,
      },
      {
        "tag": "trading_platform",
        "weight": 1.0,
      },
      {
        "tag": "speculative",
        "weight": 0.75,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "CLSK",
    "sourceSection": "Crypto",
    "primaryCategory": "crypto_fintech",
    "displayTags": [
      "Crypto",
      "Fintech",
      "Trading Platform",
      "Speculative"
    ],
    "learningTags": [
      {
        "tag": "crypto",
        "weight": 1.0,
      },
      {
        "tag": "fintech",
        "weight": 1.0,
      },
      {
        "tag": "trading_platform",
        "weight": 1.0,
      },
      {
        "tag": "speculative",
        "weight": 0.75,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "MDLZ",
    "sourceSection": "Consumer Staples",
    "primaryCategory": "consumer_staples",
    "displayTags": [
      "Consumer Staples",
      "Defensive Brand",
      "Everyday Spending",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "consumer_staples",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "HSY",
    "sourceSection": "Consumer Staples",
    "primaryCategory": "consumer_staples",
    "displayTags": [
      "Consumer Staples",
      "Defensive Brand",
      "Everyday Spending",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "consumer_staples",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "GIS",
    "sourceSection": "Consumer Staples",
    "primaryCategory": "consumer_staples",
    "displayTags": [
      "Consumer Staples",
      "Defensive Brand",
      "Everyday Spending",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "consumer_staples",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "KR",
    "sourceSection": "Consumer Staples",
    "primaryCategory": "consumer_staples",
    "displayTags": [
      "Consumer Staples",
      "Defensive Brand",
      "Everyday Spending",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "consumer_staples",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "STZ",
    "sourceSection": "Consumer Staples",
    "primaryCategory": "beverage",
    "displayTags": [
      "Beverage Brand",
      "Consumer Staples",
      "Everyday Spending",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "beverage",
        "weight": 1.0,
      },
      {
        "tag": "consumer_staples",
        "weight": 1.0,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "CL",
    "sourceSection": "Consumer Staples",
    "primaryCategory": "consumer_staples",
    "displayTags": [
      "Consumer Staples",
      "Defensive Brand",
      "Everyday Spending",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "consumer_staples",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "KMB",
    "sourceSection": "Consumer Staples",
    "primaryCategory": "consumer_staples",
    "displayTags": [
      "Consumer Staples",
      "Defensive Brand",
      "Everyday Spending",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "consumer_staples",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "MNST",
    "sourceSection": "Consumer Staples",
    "primaryCategory": "beverage",
    "displayTags": [
      "Beverage Brand",
      "Consumer Staples",
      "Everyday Spending",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "beverage",
        "weight": 1.0,
      },
      {
        "tag": "consumer_staples",
        "weight": 1.0,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "NEM",
    "sourceSection": "Materials",
    "primaryCategory": "metals_mining",
    "displayTags": [
      "Metals/Mining",
      "Commodity",
      "Inflation Hedge",
      "Cyclical"
    ],
    "learningTags": [
      {
        "tag": "materials",
        "weight": 1.0,
      },
      {
        "tag": "metals_mining",
        "weight": 1.0,
      },
      {
        "tag": "commodity_sensitive",
        "weight": 0.75,
      },
      {
        "tag": "inflation_hedge",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "FCX",
    "sourceSection": "Materials",
    "primaryCategory": "metals_mining",
    "displayTags": [
      "Metals/Mining",
      "Commodity",
      "Inflation Hedge",
      "Cyclical"
    ],
    "learningTags": [
      {
        "tag": "materials",
        "weight": 1.0,
      },
      {
        "tag": "metals_mining",
        "weight": 1.0,
      },
      {
        "tag": "commodity_sensitive",
        "weight": 0.75,
      },
      {
        "tag": "inflation_hedge",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "ALB",
    "sourceSection": "Materials",
    "primaryCategory": "metals_mining",
    "displayTags": [
      "Metals/Mining",
      "Commodity",
      "Inflation Hedge",
      "Cyclical"
    ],
    "learningTags": [
      {
        "tag": "materials",
        "weight": 1.0,
      },
      {
        "tag": "metals_mining",
        "weight": 1.0,
      },
      {
        "tag": "commodity_sensitive",
        "weight": 0.75,
      },
      {
        "tag": "inflation_hedge",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "APD",
    "sourceSection": "Materials",
    "primaryCategory": "metals_mining",
    "displayTags": [
      "Metals/Mining",
      "Commodity",
      "Inflation Hedge",
      "Cyclical"
    ],
    "learningTags": [
      {
        "tag": "materials",
        "weight": 1.0,
      },
      {
        "tag": "metals_mining",
        "weight": 1.0,
      },
      {
        "tag": "commodity_sensitive",
        "weight": 0.75,
      },
      {
        "tag": "inflation_hedge",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "LIN",
    "sourceSection": "Materials",
    "primaryCategory": "metals_mining",
    "displayTags": [
      "Metals/Mining",
      "Commodity",
      "Inflation Hedge",
      "Cyclical"
    ],
    "learningTags": [
      {
        "tag": "materials",
        "weight": 1.0,
      },
      {
        "tag": "metals_mining",
        "weight": 1.0,
      },
      {
        "tag": "commodity_sensitive",
        "weight": 0.75,
      },
      {
        "tag": "inflation_hedge",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "WDAY",
    "sourceSection": "Enterprise Software",
    "primaryCategory": "enterprise_software",
    "displayTags": [
      "Enterprise Software",
      "Cloud",
      "SaaS",
      "Recurring Revenue"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "cloud",
        "weight": 0.75,
      },
      {
        "tag": "saas",
        "weight": 1.0,
      },
      {
        "tag": "recurring_revenue",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "VEEV",
    "sourceSection": "Enterprise Software",
    "primaryCategory": "enterprise_software",
    "displayTags": [
      "Enterprise Software",
      "Cloud",
      "SaaS",
      "Recurring Revenue"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "cloud",
        "weight": 0.75,
      },
      {
        "tag": "saas",
        "weight": 1.0,
      },
      {
        "tag": "recurring_revenue",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "DOCU",
    "sourceSection": "Enterprise Software",
    "primaryCategory": "enterprise_software",
    "displayTags": [
      "Enterprise Software",
      "Cloud",
      "SaaS",
      "Recurring Revenue"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "cloud",
        "weight": 0.75,
      },
      {
        "tag": "saas",
        "weight": 1.0,
      },
      {
        "tag": "recurring_revenue",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "CDNS",
    "sourceSection": "Enterprise Software",
    "primaryCategory": "enterprise_software",
    "displayTags": [
      "Enterprise Software",
      "Cloud",
      "SaaS",
      "Recurring Revenue"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "cloud",
        "weight": 0.75,
      },
      {
        "tag": "saas",
        "weight": 1.0,
      },
      {
        "tag": "recurring_revenue",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "SNPS",
    "sourceSection": "Enterprise Software",
    "primaryCategory": "enterprise_software",
    "displayTags": [
      "Enterprise Software",
      "Cloud",
      "SaaS",
      "Recurring Revenue"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "cloud",
        "weight": 0.75,
      },
      {
        "tag": "saas",
        "weight": 1.0,
      },
      {
        "tag": "recurring_revenue",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "EBAY",
    "sourceSection": "New additions",
    "primaryCategory": "ecommerce_marketplace",
    "displayTags": [
      "E-Commerce",
      "Marketplace",
      "Consumer Brand",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "ecommerce",
        "weight": 1.0,
      },
      {
        "tag": "marketplace",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "DUOL",
    "sourceSection": "New additions",
    "primaryCategory": "consumer_tech",
    "displayTags": [
      "Consumer Tech",
      "Familiar Brand",
      "Hardware",
      "Services"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "hardware",
        "weight": 0.75,
      },
      {
        "tag": "services",
        "weight": 0.5,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "APP",
    "sourceSection": "New additions",
    "primaryCategory": "adtech",
    "displayTags": [
      "Ad Tech",
      "Digital Ads",
      "Software",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "digital_ads",
        "weight": 0.75,
      },
      {
        "tag": "adtech",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "CVNA",
    "sourceSection": "New additions",
    "primaryCategory": "retail",
    "displayTags": [
      "Retail",
      "Consumer Brand",
      "Everyday Spending",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "retail",
        "weight": 1.0,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "BMBL",
    "sourceSection": "New additions",
    "primaryCategory": "social_media",
    "displayTags": [
      "Social Platform",
      "Digital Ads",
      "Consumer App",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "consumer_platform",
        "weight": 0.75,
      },
      {
        "tag": "social_media",
        "weight": 1.0,
      },
      {
        "tag": "digital_ads",
        "weight": 0.75,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "BROS",
    "sourceSection": "New additions",
    "primaryCategory": "restaurant",
    "displayTags": [
      "Consumer Brand",
      "Restaurant",
      "Familiar Brand",
      "Everyday Spending"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "restaurant",
        "weight": 1.0,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "WING",
    "sourceSection": "New additions",
    "primaryCategory": "restaurant",
    "displayTags": [
      "Consumer Brand",
      "Restaurant",
      "Familiar Brand",
      "Everyday Spending"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "restaurant",
        "weight": 1.0,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "SHAK",
    "sourceSection": "New additions",
    "primaryCategory": "restaurant",
    "displayTags": [
      "Consumer Brand",
      "Restaurant",
      "Familiar Brand",
      "Everyday Spending"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "restaurant",
        "weight": 1.0,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "CART",
    "sourceSection": "New additions",
    "primaryCategory": "ecommerce_marketplace",
    "displayTags": [
      "E-Commerce",
      "Marketplace",
      "Consumer Brand",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "ecommerce",
        "weight": 1.0,
      },
      {
        "tag": "marketplace",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "TM",
    "sourceSection": "New additions",
    "primaryCategory": "auto_legacy",
    "displayTags": [
      "Auto",
      "Industrial Consumer",
      "Cyclical",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "auto",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "industrial",
        "weight": 0.75,
      },
      {
        "tag": "cyclical",
        "weight": 0.5,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "SONY",
    "sourceSection": "New additions",
    "primaryCategory": "streaming_media",
    "displayTags": [
      "Streaming",
      "Entertainment",
      "Consumer Brand",
      "Subscriptions"
    ],
    "learningTags": [
      {
        "tag": "streaming",
        "weight": 1.0,
      },
      {
        "tag": "entertainment",
        "weight": 0.75,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "subscription",
        "weight": 0.75,
      },
      {
        "tag": "media",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "BYND",
    "sourceSection": "New additions",
    "primaryCategory": "consumer_staples",
    "displayTags": [
      "Consumer Staples",
      "Defensive Brand",
      "Everyday Spending",
      "Dividend"
    ],
    "learningTags": [
      {
        "tag": "consumer_staples",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "defensive",
        "weight": 0.5,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "dividend_income",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "WRBY",
    "sourceSection": "New additions",
    "primaryCategory": "retail",
    "displayTags": [
      "Retail",
      "Consumer Brand",
      "Everyday Spending",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "retail",
        "weight": 1.0,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "GME",
    "sourceSection": "New additions",
    "primaryCategory": "meme_stock",
    "displayTags": [
      "Meme Stock",
      "Speculative",
      "Consumer Brand",
      "Volatile"
    ],
    "learningTags": [
      {
        "tag": "meme_stock",
        "weight": 1.0,
      },
      {
        "tag": "speculative",
        "weight": 0.75,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "volatile",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "AMC",
    "sourceSection": "New additions",
    "primaryCategory": "meme_stock",
    "displayTags": [
      "Meme Stock",
      "Speculative",
      "Consumer Brand",
      "Volatile"
    ],
    "learningTags": [
      {
        "tag": "meme_stock",
        "weight": 1.0,
      },
      {
        "tag": "speculative",
        "weight": 0.75,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "volatile",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "NIO",
    "sourceSection": "New additions",
    "primaryCategory": "auto_ev",
    "displayTags": [
      "EV/Auto",
      "Consumer Brand",
      "High Growth",
      "Speculative"
    ],
    "learningTags": [
      {
        "tag": "electric_vehicles",
        "weight": 1.0,
      },
      {
        "tag": "auto",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "speculative",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "CHWY",
    "sourceSection": "New additions",
    "primaryCategory": "retail",
    "displayTags": [
      "Retail",
      "Consumer Brand",
      "Everyday Spending",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "retail",
        "weight": 1.0,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "LCID",
    "sourceSection": "New additions",
    "primaryCategory": "auto_ev",
    "displayTags": [
      "EV/Auto",
      "Consumer Brand",
      "High Growth",
      "Speculative"
    ],
    "learningTags": [
      {
        "tag": "electric_vehicles",
        "weight": 1.0,
      },
      {
        "tag": "auto",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "speculative",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "LYV",
    "sourceSection": "New additions",
    "primaryCategory": "streaming_media",
    "displayTags": [
      "Streaming",
      "Entertainment",
      "Consumer Brand",
      "Subscriptions"
    ],
    "learningTags": [
      {
        "tag": "streaming",
        "weight": 1.0,
      },
      {
        "tag": "entertainment",
        "weight": 0.75,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "subscription",
        "weight": 0.75,
      },
      {
        "tag": "media",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "CAKE",
    "sourceSection": "New additions",
    "primaryCategory": "restaurant",
    "displayTags": [
      "Consumer Brand",
      "Restaurant",
      "Familiar Brand",
      "Everyday Spending"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "restaurant",
        "weight": 1.0,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "TXRH",
    "sourceSection": "New additions",
    "primaryCategory": "restaurant",
    "displayTags": [
      "Consumer Brand",
      "Restaurant",
      "Familiar Brand",
      "Everyday Spending"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "restaurant",
        "weight": 1.0,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "DENN",
    "sourceSection": "New additions",
    "primaryCategory": "restaurant",
    "displayTags": [
      "Consumer Brand",
      "Restaurant",
      "Familiar Brand",
      "Everyday Spending"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "restaurant",
        "weight": 1.0,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "JACK",
    "sourceSection": "New additions",
    "primaryCategory": "restaurant",
    "displayTags": [
      "Consumer Brand",
      "Restaurant",
      "Familiar Brand",
      "Everyday Spending"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "restaurant",
        "weight": 1.0,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "PZZA",
    "sourceSection": "New additions",
    "primaryCategory": "restaurant",
    "displayTags": [
      "Consumer Brand",
      "Restaurant",
      "Familiar Brand",
      "Everyday Spending"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "restaurant",
        "weight": 1.0,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "BLMN",
    "sourceSection": "New additions",
    "primaryCategory": "restaurant",
    "displayTags": [
      "Consumer Brand",
      "Restaurant",
      "Familiar Brand",
      "Everyday Spending"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "restaurant",
        "weight": 1.0,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "EAT",
    "sourceSection": "New additions",
    "primaryCategory": "restaurant",
    "displayTags": [
      "Consumer Brand",
      "Restaurant",
      "Familiar Brand",
      "Everyday Spending"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "restaurant",
        "weight": 1.0,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "RKLB",
    "sourceSection": "New additions",
    "primaryCategory": "space_airmobility",
    "displayTags": [
      "Space/Air Mobility",
      "Speculative",
      "High Growth",
      "Innovation"
    ],
    "learningTags": [
      {
        "tag": "space",
        "weight": 1.0,
      },
      {
        "tag": "air_mobility",
        "weight": 1.0,
      },
      {
        "tag": "speculative",
        "weight": 0.75,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "innovation",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "ASTS",
    "sourceSection": "New additions",
    "primaryCategory": "space_airmobility",
    "displayTags": [
      "Space/Air Mobility",
      "Speculative",
      "High Growth",
      "Innovation"
    ],
    "learningTags": [
      {
        "tag": "space",
        "weight": 1.0,
      },
      {
        "tag": "air_mobility",
        "weight": 1.0,
      },
      {
        "tag": "speculative",
        "weight": 0.75,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "innovation",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "CELH",
    "sourceSection": "New additions",
    "primaryCategory": "food_beverage_growth",
    "displayTags": [
      "Beverage Brand",
      "High Growth",
      "Consumer Brand",
      "Everyday Spending"
    ],
    "learningTags": [
      {
        "tag": "beverage",
        "weight": 1.0,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "WYNN",
    "sourceSection": "New additions",
    "primaryCategory": "casino_entertainment",
    "displayTags": [
      "Casino/Gaming",
      "Travel",
      "Entertainment",
      "Consumer"
    ],
    "learningTags": [
      {
        "tag": "casino_gaming",
        "weight": 1.0,
      },
      {
        "tag": "travel",
        "weight": 1.0,
      },
      {
        "tag": "entertainment",
        "weight": 0.75,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "ACMR",
    "sourceSection": "New additions",
    "primaryCategory": "semiconductor_equipment",
    "displayTags": [
      "Semiconductor",
      "Chip Equipment",
      "AI Supply Chain",
      "Cyclical"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "semiconductor",
        "weight": 1.0,
      },
      {
        "tag": "chip_equipment",
        "weight": 0.75,
      },
      {
        "tag": "ai_supply_chain",
        "weight": 0.75,
      },
      {
        "tag": "cyclical",
        "weight": 0.5,
      }
    ]
  },
  {
    "ticker": "LUNR",
    "sourceSection": "New additions",
    "primaryCategory": "space_airmobility",
    "displayTags": [
      "Space/Air Mobility",
      "Speculative",
      "High Growth",
      "Innovation"
    ],
    "learningTags": [
      {
        "tag": "space",
        "weight": 1.0,
      },
      {
        "tag": "air_mobility",
        "weight": 1.0,
      },
      {
        "tag": "speculative",
        "weight": 0.75,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "innovation",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "JOBY",
    "sourceSection": "New additions",
    "primaryCategory": "space_airmobility",
    "displayTags": [
      "Space/Air Mobility",
      "Speculative",
      "High Growth",
      "Innovation"
    ],
    "learningTags": [
      {
        "tag": "space",
        "weight": 1.0,
      },
      {
        "tag": "air_mobility",
        "weight": 1.0,
      },
      {
        "tag": "speculative",
        "weight": 0.75,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "innovation",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "ACHR",
    "sourceSection": "New additions",
    "primaryCategory": "space_airmobility",
    "displayTags": [
      "Space/Air Mobility",
      "Speculative",
      "High Growth",
      "Innovation"
    ],
    "learningTags": [
      {
        "tag": "space",
        "weight": 1.0,
      },
      {
        "tag": "air_mobility",
        "weight": 1.0,
      },
      {
        "tag": "speculative",
        "weight": 0.75,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "innovation",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "GSAT",
    "sourceSection": "New additions",
    "primaryCategory": "space_airmobility",
    "displayTags": [
      "Space/Air Mobility",
      "Speculative",
      "High Growth",
      "Innovation"
    ],
    "learningTags": [
      {
        "tag": "space",
        "weight": 1.0,
      },
      {
        "tag": "air_mobility",
        "weight": 1.0,
      },
      {
        "tag": "speculative",
        "weight": 0.75,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "innovation",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "LVS",
    "sourceSection": "New additions",
    "primaryCategory": "casino_entertainment",
    "displayTags": [
      "Casino/Gaming",
      "Travel",
      "Entertainment",
      "Consumer"
    ],
    "learningTags": [
      {
        "tag": "casino_gaming",
        "weight": 1.0,
      },
      {
        "tag": "travel",
        "weight": 1.0,
      },
      {
        "tag": "entertainment",
        "weight": 0.75,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "PENN",
    "sourceSection": "New additions",
    "primaryCategory": "casino_entertainment",
    "displayTags": [
      "Casino/Gaming",
      "Travel",
      "Entertainment",
      "Consumer"
    ],
    "learningTags": [
      {
        "tag": "casino_gaming",
        "weight": 1.0,
      },
      {
        "tag": "travel",
        "weight": 1.0,
      },
      {
        "tag": "entertainment",
        "weight": 0.75,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "MLCO",
    "sourceSection": "New additions",
    "primaryCategory": "casino_entertainment",
    "displayTags": [
      "Casino/Gaming",
      "Travel",
      "Entertainment",
      "Consumer"
    ],
    "learningTags": [
      {
        "tag": "casino_gaming",
        "weight": 1.0,
      },
      {
        "tag": "travel",
        "weight": 1.0,
      },
      {
        "tag": "entertainment",
        "weight": 0.75,
      },
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      }
    ]
  },
  {
    "ticker": "SAM",
    "sourceSection": "New additions",
    "primaryCategory": "beverage",
    "displayTags": [
      "Beverage Brand",
      "Consumer Staples",
      "Everyday Spending",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "beverage",
        "weight": 1.0,
      },
      {
        "tag": "consumer_staples",
        "weight": 1.0,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "FIZZ",
    "sourceSection": "New additions",
    "primaryCategory": "beverage",
    "displayTags": [
      "Beverage Brand",
      "Consumer Staples",
      "Everyday Spending",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "beverage",
        "weight": 1.0,
      },
      {
        "tag": "consumer_staples",
        "weight": 1.0,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "KDP",
    "sourceSection": "New additions",
    "primaryCategory": "beverage",
    "displayTags": [
      "Beverage Brand",
      "Consumer Staples",
      "Everyday Spending",
      "Familiar Brand"
    ],
    "learningTags": [
      {
        "tag": "consumer_brand",
        "weight": 1.0,
      },
      {
        "tag": "beverage",
        "weight": 1.0,
      },
      {
        "tag": "consumer_staples",
        "weight": 1.0,
      },
      {
        "tag": "everyday_spending",
        "weight": 0.75,
      },
      {
        "tag": "familiar_brand",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "SOUN",
    "sourceSection": "New additions",
    "primaryCategory": "automation_ai",
    "displayTags": [
      "Automation",
      "AI Software",
      "Enterprise Tech",
      "High Growth"
    ],
    "learningTags": [
      {
        "tag": "technology",
        "weight": 1.0,
      },
      {
        "tag": "software",
        "weight": 1.0,
      },
      {
        "tag": "automation",
        "weight": 0.75,
      },
      {
        "tag": "ai",
        "weight": 1.0,
      },
      {
        "tag": "enterprise_software",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      }
    ]
  },
  {
    "ticker": "SPCE",
    "sourceSection": "New additions",
    "primaryCategory": "space_airmobility",
    "displayTags": [
      "Space/Air Mobility",
      "Speculative",
      "High Growth",
      "Innovation"
    ],
    "learningTags": [
      {
        "tag": "space",
        "weight": 1.0,
      },
      {
        "tag": "air_mobility",
        "weight": 0.75,
      },
      {
        "tag": "speculative",
        "weight": 1.0,
      },
      {
        "tag": "high_growth",
        "weight": 0.75,
      },
      {
        "tag": "innovation",
        "weight": 0.75,
      }
    ]
  }
] as const;

/** Union of every ticker string present in STAK_WEIGHTED_STOCK_TAGS.
 *  Use this as the single source of truth when typing peer-group maps or
 *  freshness-signal lists — TypeScript will error on any stale ticker. */
export type StakTicker = (typeof STAK_WEIGHTED_STOCK_TAGS)[number]["ticker"];

export const ACTION_POINTS = { save: 5, right_swipe: 5, learn_more: 3, pass: -1, left_swipe: -1, skip: 0, remove_from_watchlist: -5 } as const;
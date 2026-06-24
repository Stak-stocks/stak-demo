import { STAK_WEIGHTED_STOCK_TAGS } from "./stockTags";
import type { BrandProfile } from "./brands/index";

/**
 * Hand-curated peer ticker lists for the original ~230 tickers, carried over
 * verbatim from the old frontend/backend peerGroups.ts files. This encodes real
 * competitive-set judgment getPeerTickers() can't recover from primaryCategory
 * alone -- e.g. ETFs grouped as context peers (not fundamental comps), or
 * crypto-miners grouped because they trade as a basket despite different
 * underlying businesses. Checked first; getPeerTickers() below is the fallback
 * for any ticker (new or old) that isn't a key here.
 */
export const MANUAL_PEER_OVERRIDES: Record<string, string[]> = {

  // ── MEGA-CAP TECH ──────────────────────────────────────────────────────────
  "AAPL":  ["MSFT", "GOOGL", "META", "AMZN", "NVDA"],
  "MSFT":  ["AAPL", "GOOGL", "CRM", "ORCL", "SAP", "IBM"],
  "NVDA":  ["AMD", "AVGO", "QCOM", "MRVL", "TSM", "ASML"],
  "GOOGL": ["META", "MSFT", "AMZN", "SNAP", "RDDT"],
  "META":  ["GOOGL", "SNAP", "PINS", "RDDT", "MTCH"],
  "AMZN":  ["MSFT", "GOOGL", "SHOP", "WMT", "COST"],

  // ── EV / AUTOMOTIVE ────────────────────────────────────────────────────────
  "TSLA":  ["RIVN", "F", "GM", "NIO", "LCID", "UBER"],
  "RIVN":  ["TSLA", "LCID", "NIO", "F", "GM"],
  "NIO":   ["TSLA", "LCID", "RIVN", "F", "GM"],
  "LCID":  ["TSLA", "RIVN", "NIO", "F", "GM"],
  "F":     ["GM", "TSLA", "RIVN", "TM", "NIO"],
  "GM":    ["F", "TSLA", "RIVN", "TM", "NIO"],
  "TM":    ["F", "GM", "TSLA", "RIVN", "NIO"],
  "CVNA":  ["EBAY", "AMZN", "F", "GM", "ORLY"],

  // ── MOBILITY / DELIVERY ────────────────────────────────────────────────────
  "UBER":  ["LYFT", "DASH", "ABNB", "SHOP", "TSLA"],
  "LYFT":  ["UBER", "DASH", "ABNB"],
  "DASH":  ["UBER", "LYFT", "ABNB", "SHOP", "CART"],

  // ── STREAMING / ENTERTAINMENT ──────────────────────────────────────────────
  "NFLX":  ["DIS", "SPOT", "WBD", "ROKU", "AMZN"],
  "DIS":   ["NFLX", "WBD", "AMZN", "ROKU", "SPOT"],
  "SPOT":  ["NFLX", "AMZN", "DIS", "WBD", "RDDT"],
  "WBD":   ["DIS", "NFLX", "AMZN", "ROKU", "LYV"],
  "ROKU":  ["NFLX", "DIS", "AMZN", "TTD", "SNAP"],
  "LYV":   ["WBD", "DIS", "NFLX", "AMC", "WYNN"],
  "AMC":   ["NFLX", "DIS", "WBD", "GME", "LYV"],
  "GME":   ["AMC", "MSTR", "MARA", "RIOT", "RBLX"],

  // ── SOCIAL / CONSUMER INTERNET ─────────────────────────────────────────────
  "SNAP":  ["META", "PINS", "RDDT", "GOOGL", "MTCH"],
  "PINS":  ["SNAP", "META", "RDDT", "ETSY", "MTCH"],
  "RDDT":  ["SNAP", "META", "PINS", "MTCH", "TWLO"],
  "MTCH": ["SNAP", "META", "RDDT", "BMBL", "GOOGL"],
  "BMBL":  ["MTCH", "META", "SNAP", "RDDT", "HOOD"],

  // ── GAMING ─────────────────────────────────────────────────────────────────
  "RBLX":  ["EA", "TTWO", "MSFT", "SONY", "U"],
  "EA":    ["TTWO", "RBLX", "MSFT", "SONY", "U"],
  "TTWO":  ["EA", "RBLX", "MSFT", "SONY", "U"],
  "SONY":  ["EA", "TTWO", "MSFT", "GOOGL", "AAPL"],
  "U":     ["RBLX", "EA", "TTWO", "MSFT", "APP"],
  "DKNG":  ["MGM", "CZR", "PENN", "LVS", "WYNN"],
  "MGM":   ["CZR", "DKNG", "LVS", "WYNN", "PENN", "MLCO"],
  "CZR":   ["MGM", "DKNG", "LVS", "WYNN", "PENN", "MLCO"],
  "LVS":   ["MGM", "CZR", "WYNN", "PENN", "MLCO", "DKNG"],
  "WYNN":  ["MGM", "CZR", "LVS", "PENN", "MLCO", "DKNG"],
  "PENN":  ["DKNG", "MGM", "CZR", "LVS", "WYNN", "MLCO"],
  "MLCO":  ["MGM", "CZR", "LVS", "WYNN", "PENN", "DKNG"],

  // ── SAAS / CLOUD ───────────────────────────────────────────────────────────
  "CRM":   ["NOW", "ADBE", "ORCL", "WDAY", "HUBS", "INTU"],
  "ADBE":  ["CRM", "NOW", "INTU", "MSFT"],
  "NOW":   ["CRM", "WDAY", "ADBE", "ORCL", "SAP"],
  "WDAY":  ["NOW", "CRM", "SAP", "ORCL", "ADBE"],
  "HUBS":  ["CRM", "ORCL", "NOW", "ADBE", "INTU"],
  "INTU":  ["ADBE", "CRM", "PAYX", "ADP", "HUBS"],
  "ORCL":  ["CRM", "SAP", "MSFT", "IBM", "NOW"],
  "SAP":   ["ORCL", "MSFT", "CRM", "NOW", "WDAY"],
  "IBM":   ["ORCL", "ACN", "MSFT", "DELL", "HPQ"],
  "ACN":   ["IBM", "ORCL", "SAP", "MSFT", "INTU"],
  "DELL":  ["IBM", "HPQ", "ORCL", "MSFT", "SMCI"],
  "HPQ":   ["DELL", "IBM", "ORCL", "MSFT"],
  "TEAM":  ["MSFT", "NOW", "CRM", "DDOG", "SNOW"],
  "ZM":    ["MSFT", "TEAM", "TWLO", "CRM", "NOW"],
  "DOCU":  ["CRM", "NOW", "ADBE", "WDAY", "SAP"],
  "VEEV":  ["CRM", "ORCL", "NOW", "WDAY", "ADBE"],
  "PATH":  ["NOW", "CRM", "MSFT", "SAP", "ORCL"],
  "BILL":  ["SQ", "FIS", "FISV", "ADP", "ORCL", "INTU"],
  "TWLO":  ["NET", "NOW", "CRM", "RDDT", "SNAP"],

  // ── DATA / ANALYTICS ───────────────────────────────────────────────────────
  "SNOW":  ["DDOG", "MDB", "NET", "PLTR", "TEAM"],
  "DDOG":  ["SNOW", "MDB", "NET", "PANW", "CRWD"],
  "PLTR":  ["SNOW", "DDOG", "MDB", "NET", "S"],
  "MDB":   ["SNOW", "DDOG", "PLTR", "NET", "TEAM"],

  // ── CYBERSECURITY ──────────────────────────────────────────────────────────
  "CRWD":  ["PANW", "NET", "ZS", "FTNT", "S", "OKTA"],
  "PANW":  ["CRWD", "NET", "ZS", "FTNT", "S", "OKTA"],
  "NET":   ["ZS", "PANW", "CRWD", "DDOG", "FTNT"],
  "ZS":    ["NET", "PANW", "CRWD", "FTNT", "OKTA", "S"],
  "FTNT":  ["NET", "PANW", "CRWD", "ZS", "S", "OKTA"],
  "OKTA":  ["ZS", "CRWD", "PANW", "NET", "S", "TWLO"],
  "S":     ["CRWD", "PANW", "NET", "ZS", "FTNT"],

  // ── FINTECH / PAYMENTS ─────────────────────────────────────────────────────
  "V":     ["MA", "SQ", "PYPL", "AXP", "COF"],
  "MA":    ["V", "SQ", "PYPL", "AXP", "COF"],
  "SQ":    ["PYPL", "HOOD", "COIN", "AFRM", "SOFI", "V"],
  "PYPL":  ["SQ", "V", "MA", "AFRM", "HOOD", "SOFI"],
  "HOOD":  ["SQ", "COIN", "PYPL", "SOFI", "AFRM", "NU"],
  "SOFI":  ["HOOD", "PYPL", "AFRM", "NU", "UPST", "SQ"],
  "AFRM":  ["SOFI", "PYPL", "NU", "UPST", "SQ", "HOOD"],
  "COIN":  ["HOOD", "SQ", "PYPL", "MSTR", "MARA", "RIOT"],
  "NU":    ["SOFI", "HOOD", "MELI", "SE", "PYPL", "AFRM"],
  "UPST":  ["SOFI", "AFRM", "SYF", "ALLY", "OMF"],
  "MELI":  ["SE", "NU", "BABA", "JD", "AMZN", "SHOP"],
  "SE":    ["MELI", "NU", "BABA", "JD", "AMZN", "SHOP"],

  // ── BIG BANKS ──────────────────────────────────────────────────────────────
  "JPM":   ["GS", "MS", "BAC", "C", "WFC", "BLK"],
  "GS":    ["JPM", "MS", "BAC", "C", "BX", "KKR"],
  "MS":    ["JPM", "GS", "BAC", "BX", "KKR", "APO"],
  "C":     ["JPM", "BAC", "WFC", "PNC", "USB", "TFC"],
  "BAC":   ["JPM", "C", "WFC", "PNC", "USB", "TFC"],
  "WFC":   ["JPM", "C", "BAC", "PNC", "USB", "TFC"],
  "BLK":   ["GS", "MS", "TROW", "BX", "KKR", "APO"],
  "AXP":   ["V", "MA", "COF", "SYF", "ALLY"],
  "COF":   ["AXP", "SYF", "ALLY", "JPM", "BAC", "WFC"],
  "SCHW":  ["HOOD", "PYPL", "JPM", "MS", "GS"],
  "BRK.B": ["JPM", "GS", "BAC", "BLK", "MS"],

  // ── ALTERNATIVE ASSET MANAGERS ─────────────────────────────────────────────
  "BX":    ["KKR", "APO", "GS", "MS", "BLK"],
  "KKR":   ["BX", "APO", "GS", "MS", "BLK"],
  "APO":   ["BX", "KKR", "GS", "MS", "BLK"],

  // ── REGIONAL BANKS ─────────────────────────────────────────────────────────
  "PNC":   ["USB", "TFC", "KEY", "RF", "CFG", "BAC"],
  "USB":   ["PNC", "TFC", "KEY", "RF", "CFG", "BAC"],
  "TFC":   ["PNC", "USB", "KEY", "RF", "CFG", "BAC"],
  "KEY":   ["PNC", "USB", "TFC", "RF", "CFG"],
  "RF":    ["PNC", "USB", "TFC", "KEY", "CFG"],
  "CFG":   ["PNC", "USB", "TFC", "KEY", "RF"],

  // ── INSURANCE ──────────────────────────────────────────────────────────────
  "AIG":   ["MET", "PRU", "AFL", "ALL", "CB", "TRV", "HIG"],
  "MET":   ["AIG", "PRU", "AFL", "ALL", "CB", "TRV"],
  "PRU":   ["AIG", "MET", "AFL", "ALL", "CB", "TRV"],
  "AFL":   ["AIG", "MET", "PRU", "ALL", "CB", "HIG"],
  "ALL":   ["AIG", "MET", "PRU", "AFL", "CB", "TRV", "HIG"],
  "CB":    ["AIG", "MET", "PRU", "AFL", "ALL", "TRV", "HIG"],
  "TRV":   ["AIG", "MET", "PRU", "AFL", "ALL", "CB", "HIG"],
  "HIG":   ["AIG", "MET", "PRU", "AFL", "ALL", "CB", "TRV"],
  "LNC":   ["MET", "PRU", "AFL", "ALL", "PFG"],
  "PFG":   ["TROW", "IVZ", "BEN", "AMP", "MET"],
  "AJG":   ["MMC", "AON", "MET", "PRU", "HIG"],
  "AON":   ["MMC", "AJG", "MET", "PRU", "HIG"],
  "MMC":   ["AON", "AJG", "MET", "PRU", "HIG"],

  // ── FINANCIAL INFRASTRUCTURE ───────────────────────────────────────────────
  "FIS":   ["FISV", "GPN", "ADP", "PAYX", "NDAQ", "ICE"],
  "FISV":  ["FIS", "GPN", "ADP", "PAYX", "NDAQ", "ICE"],
  "GPN":   ["FIS", "FISV", "ADP", "PAYX", "NDAQ", "ICE"],
  "ADP":   ["PAYX", "FIS", "FISV", "INTU", "IBM"],
  "PAYX":  ["ADP", "FIS", "FISV", "INTU", "IBM"],
  "NDAQ":  ["ICE", "CME", "SPGI", "MCO", "CBOE", "FDS"],
  "ICE":   ["NDAQ", "CME", "SPGI", "MCO", "CBOE"],
  "CME":   ["NDAQ", "ICE", "SPGI", "MCO", "CBOE"],
  "SPGI":  ["MCO", "NDAQ", "ICE", "MSCI", "FDS"],
  "MCO":   ["SPGI", "NDAQ", "ICE", "MSCI", "FDS"],
  "MSCI":  ["SPGI", "MCO", "NDAQ", "FDS", "SSNC"],
  "CBOE":  ["NDAQ", "ICE", "CME", "SPGI", "MCO"],
  "FDS":   ["MSCI", "SPGI", "MCO", "NDAQ", "SSNC"],
  "SSNC":  ["FDS", "MSCI", "SPGI", "ADP", "FIS"],
  "WEX":   ["FIS", "FISV", "SQ", "PYPL", "ADP"],
  "NCNO":  ["FIS", "FISV", "BILL", "SQ", "UPST"],
  "TOST":  ["SQ", "FIS", "FISV", "ADP", "ORCL"],

  // ── ASSET MANAGERS ─────────────────────────────────────────────────────────
  "TROW":  ["BLK", "IVZ", "BEN", "AMP", "SCHW"],
  "IVZ":   ["TROW", "BLK", "BEN", "AMP", "SCHW"],
  "BEN":   ["TROW", "IVZ", "BLK", "AMP", "SCHW"],
  "AMP":   ["TROW", "IVZ", "BEN", "BLK", "SCHW"],
  "BK":    ["STT", "NTRS", "MS", "JPM", "GS"],
  "STT":   ["BK", "NTRS", "MS", "JPM", "GS"],
  "NTRS":  ["BK", "STT", "MS", "JPM", "GS"],
  "SYF":   ["COF", "AXP", "ALLY", "HOOD", "PYPL"],
  "ALLY":  ["SYF", "COF", "AXP", "HOOD", "UPST"],
  "OMF":   ["UPST", "AFRM", "SYF", "ALLY", "COF"],
  "EVR":   ["GS", "MS", "JPM", "KKR", "BX"],
  "RJF":   ["GS", "MS", "JPM", "SCHW", "BK"],
  "EFX":   ["SPGI", "MCO", "MSCI", "FDS", "NDAQ"],

  // ── SEMICONDUCTORS ─────────────────────────────────────────────────────────
  "AMD":   ["NVDA", "AVGO", "QCOM", "MRVL", "TSM", "INTC"],
  "AVGO":  ["QCOM", "MRVL", "TXN", "ADI", "TSM", "NVDA"],
  "QCOM":  ["AVGO", "MRVL", "TXN", "ADI", "AMD", "NVDA"],
  "TSM":   ["ASML", "AMAT", "LRCX", "MRVL", "QCOM"],
  "ASML":  ["AMAT", "LRCX", "TSM", "TXN", "ADI"],
  "MU":    ["NVDA", "AMD", "ON", "SMCI", "AVGO"],
  "INTC":  ["AMD", "QCOM", "TXN", "ADI", "MRVL", "AVGO"],
  "MRVL":  ["QCOM", "AVGO", "TXN", "ADI", "NVDA", "AMD"],
  "TXN":   ["ADI", "MRVL", "QCOM", "AVGO", "ON", "MCHP"],
  "ADI":   ["TXN", "MRVL", "QCOM", "AVGO", "ON", "MCHP"],
  "ON":    ["TXN", "ADI", "MRVL", "QCOM", "AVGO", "MCHP"],
  "MPWR":  ["TXN", "ADI", "ON", "MCHP", "AVGO"],
  "SWKS":  ["QCOM", "AVGO", "TXN", "ADI", "MRVL"],
  "AMAT":  ["ASML", "LRCX", "TSM", "TXN", "NVDA"],
  "LRCX":  ["AMAT", "ASML", "TSM", "TXN", "NVDA"],
  "ACMR":  ["AMAT", "LRCX", "ASML", "TSM", "NVDA"],
  "SMCI":  ["DELL", "IBM", "NVDA", "AMD", "AVGO"],
  "ARM":   ["QCOM", "AVGO", "MRVL", "TXN", "ADI", "TSM"],
  "MCHP":  ["TXN", "ADI", "ON", "MRVL", "AVGO", "MPWR"],
  "IONQ":  ["IBM", "MSFT", "GOOGL", "NVDA", "AMD"],
  "NXPI":  ["TXN", "ADI", "MRVL", "QCOM", "ON", "MCHP"],

  // ── E-COMMERCE / RETAIL ────────────────────────────────────────────────────
  "SHOP":  ["AMZN", "EBAY", "ETSY", "WMT", "MELI"],
  "ETSY":  ["SHOP", "EBAY", "AMZN", "PINS", "CART"],
  "EBAY":  ["AMZN", "SHOP", "ETSY", "WMT", "TGT"],
  "CART":  ["AMZN", "WMT", "TGT", "SHOP", "ETSY"],
  "CHWY":  ["AMZN", "EBAY", "TGT", "COST", "WMT"],
  "WMT":   ["TGT", "COST", "AMZN", "HD", "LOW", "KR"],
  "COST":  ["WMT", "TGT", "AMZN", "HD", "LOW"],
  "TGT":   ["WMT", "COST", "AMZN", "HD", "DLTR", "DG"],
  "HD":    ["LOW", "WMT", "COST", "AZO", "ORLY"],
  "LOW":   ["HD", "WMT", "COST", "AZO", "ORLY"],
  "DLTR":  ["DG", "WMT", "TGT", "BURL", "ROST", "TJX"],
  "DG":    ["DLTR", "WMT", "TGT", "BURL", "ROST"],
  "BURL":  ["TJX", "ROST", "DLTR", "DG", "TGT"],
  "TJX":   ["ROST", "BURL", "DLTR", "DG", "TGT"],
  "ROST":  ["TJX", "BURL", "DLTR", "DG", "TGT"],
  "AZO":   ["ORLY", "TSCO", "HD", "LOW"],
  "ORLY":  ["AZO", "TSCO", "HD", "LOW"],
  "TSCO":  ["AZO", "ORLY", "HD", "LOW", "WMT"],
  "KR":    ["WMT", "COST", "TGT", "MDLZ"],

  // ── RESTAURANTS ────────────────────────────────────────────────────────────
  "SBUX":  ["MCD", "CMG", "YUM", "BROS", "TXRH", "WING"],
  "MCD":   ["YUM", "CMG", "SBUX", "BROS", "JACK", "DPZ"],
  "CMG":   ["MCD", "SBUX", "YUM", "BROS", "TXRH", "WING"],
  "YUM":   ["MCD", "CMG", "SBUX", "BROS", "JACK", "DPZ"],
  "BROS":  ["MCD", "CMG", "SBUX", "YUM", "WING", "SHAK"],
  "TXRH":  ["CMG", "MCD", "BLMN", "EAT", "CAKE"],
  "WING":  ["CMG", "MCD", "SBUX", "BROS", "SHAK", "TXRH"],
  "SHAK":  ["CMG", "BROS", "WING", "MCD", "TXRH"],
  "DPZ":   ["MCD", "YUM", "CMG", "SBUX", "JACK"],
  "JACK":  ["MCD", "YUM", "DPZ", "SBUX", "DENN"],
  "DENN":  ["MCD", "YUM", "DPZ", "JACK", "SBUX"],
  "PZZA":  ["MCD", "YUM", "DPZ", "JACK", "CMG"],
  "BLMN":  ["TXRH", "EAT", "MCD", "YUM", "CMG"],
  "EAT":   ["BLMN", "TXRH", "MCD", "YUM", "CMG"],
  "CAKE":  ["BLMN", "EAT", "TXRH", "MCD", "CMG"],

  // ── FASHION / LIFESTYLE ────────────────────────────────────────────────────
  "NKE":   ["LULU", "TPR", "ULTA", "ELF", "OR"],
  "LULU":  ["NKE", "PTON", "TPR", "ULTA", "ELF"],
  "TPR":   ["NKE", "LULU", "ELF", "ULTA", "OR"],
  "WRBY":  ["ULTA", "ELF", "LULU", "TPR", "ETSY"],
  "PTON":  ["NKE", "LULU", "NFLX", "DASH", "HIMS"],

  // ── BEAUTY / COSMETICS ─────────────────────────────────────────────────────
  "ULTA":  ["ELF", "OR", "EL", "COTY", "LULU"],
  "ELF":   ["ULTA", "OR", "EL", "COTY", "LULU"],
  "OR":    ["EL", "ELF", "ULTA", "COTY", "NKE"],
  "EL":    ["OR", "ELF", "ULTA", "COTY"],
  "COTY":  ["OR", "EL", "ELF", "ULTA", "TPR"],

  // ── TRAVEL / HOSPITALITY ───────────────────────────────────────────────────
  "ABNB":  ["MAR", "HLT", "UBER", "LYFT"],
  "MAR":   ["HLT", "RCL", "ABNB", "WYNN", "LVS"],
  "HLT":   ["MAR", "RCL", "ABNB", "WYNN", "LVS", "MGM"],
  "RCL":   ["MAR", "HLT", "ABNB", "WYNN", "LVS"],

  // ── AIRLINES ───────────────────────────────────────────────────────────────
  "DAL":   ["UAL", "LUV", "AAL", "FDX", "UPS"],
  "UAL":   ["DAL", "LUV", "AAL", "FDX", "UPS"],
  "LUV":   ["DAL", "UAL", "AAL", "FDX", "UPS"],
  "AAL":   ["DAL", "UAL", "LUV", "FDX", "UPS"],

  // ── LOGISTICS ──────────────────────────────────────────────────────────────
  "UPS":   ["FDX", "DAL", "UAL", "AMZN", "WMT"],
  "FDX":   ["UPS", "DAL", "UAL", "AMZN", "WMT"],
  "UNP":   ["CSX", "UPS", "FDX", "CAT"],
  "CSX":   ["UNP", "UPS", "FDX", "CAT"],

  // ── INDUSTRIALS ────────────────────────────────────────────────────────────
  "CAT":   ["DE", "ETN", "EMR", "ITW", "IR", "HON"],
  "DE":    ["CAT", "ETN", "EMR", "ITW", "IR", "HON"],
  "ETN":   ["CAT", "DE", "EMR", "ITW", "IR", "HON"],
  "EMR":   ["CAT", "DE", "ETN", "ITW", "IR", "HON"],
  "ITW":   ["CAT", "DE", "ETN", "EMR", "IR", "HON"],
  "IR":    ["CAT", "DE", "ETN", "EMR", "ITW", "HON"],
  "HON":   ["CAT", "DE", "ETN", "EMR", "RTX", "GE"],
  "MMM":   ["HON", "EMR", "ETN", "CAT", "DE"],

  // ── DEFENSE / AEROSPACE ────────────────────────────────────────────────────
  "LMT":   ["RTX", "NOC", "LHX", "BA", "GE"],
  "RTX":   ["LMT", "NOC", "LHX", "BA", "GE", "HON"],
  "NOC":   ["LMT", "RTX", "LHX", "BA", "GE"],
  "LHX":   ["LMT", "RTX", "NOC", "BA", "GE"],
  "BA":    ["LMT", "RTX", "NOC", "LHX", "GE", "RKLB"],
  "GE":    ["LMT", "RTX", "NOC", "BA", "HON", "ETN"],

  // ── SPACE / EMERGING AEROSPACE ─────────────────────────────────────────────
  "RKLB":  ["JOBY", "ACHR", "ASTS", "LUNR", "BA", "LMT"],
  "ASTS":  ["RKLB", "JOBY", "ACHR", "LUNR", "BA"],
  "LUNR":  ["RKLB", "ASTS", "JOBY", "ACHR", "BA"],
  "JOBY":  ["ACHR", "RKLB", "ASTS", "LUNR", "BA"],
  "ACHR":  ["JOBY", "RKLB", "ASTS", "LUNR", "BA"],
  "GSAT":  ["RKLB", "ASTS", "T", "VZ", "TMUS"],

  // ── TELECOM ────────────────────────────────────────────────────────────────
  "T":     ["VZ", "TMUS", "NFLX"],
  "VZ":    ["T", "TMUS", "NFLX"],
  "TMUS":  ["T", "VZ", "NFLX"],

  // ── UTILITIES ──────────────────────────────────────────────────────────────
  "NEE":   ["DUK", "SO", "D", "AEP", "EXC", "ENPH"],
  "DUK":   ["NEE", "SO", "D", "AEP", "EXC"],
  "SO":    ["NEE", "DUK", "D", "AEP", "EXC"],
  "D":     ["NEE", "DUK", "SO", "AEP", "EXC"],
  "AEP":   ["NEE", "DUK", "SO", "D", "EXC"],
  "EXC":   ["NEE", "DUK", "SO", "D", "AEP"],

  // ── CLEAN ENERGY ───────────────────────────────────────────────────────────
  "ENPH":  ["FSLR", "PLUG", "NEE", "TSLA"],
  "FSLR":  ["ENPH", "PLUG", "NEE", "TSLA"],
  "PLUG":  ["ENPH", "FSLR", "NEE", "TSLA"],

  // ── REITS ──────────────────────────────────────────────────────────────────
  "AMT":   ["DLR", "EQIX", "PLD", "O"],
  "DLR":   ["AMT", "EQIX", "PLD", "O"],
  "EQIX":  ["AMT", "DLR", "PLD", "NET", "O"],
  "PLD":   ["AMT", "DLR", "EQIX", "O", "SPG"],
  "O":     ["AMT", "PLD", "SPG", "DLR", "NEE"],
  "SPG":   ["O", "PLD", "AMT", "DLR", "EQIX"],

  // ── HEALTHCARE — PHARMA / BIOTECH ──────────────────────────────────────────
  "PFE":   ["ABBV", "MRK", "AMGN", "LLY", "MRNA", "BMY"],
  "ABBV":  ["PFE", "MRK", "AMGN", "LLY", "GILD", "REGN"],
  "MRK":   ["PFE", "ABBV", "AMGN", "LLY", "GILD", "REGN"],
  "LLY":   ["NVO", "ABBV", "MRK", "PFE", "AMGN", "REGN"],
  "MRNA":  ["PFE", "BMY", "ABBV", "AMGN", "REGN"],
  "BMY":   ["PFE", "ABBV", "MRK", "AMGN", "GILD", "REGN"],
  "AMGN":  ["ABBV", "MRK", "PFE", "LLY", "GILD", "REGN", "VRTX"],
  "GILD":  ["ABBV", "MRK", "PFE", "AMGN", "REGN", "VRTX"],
  "REGN":  ["ABBV", "MRK", "PFE", "AMGN", "GILD", "VRTX"],
  "VRTX":  ["ABBV", "REGN", "AMGN", "GILD", "BIIB"],
  "BIIB":  ["VRTX", "ABBV", "REGN", "AMGN", "GILD"],
  "NVO":   ["LLY", "ABBV", "MRK", "PFE", "AMGN"],

  // ── HEALTHCARE — DEVICES / SERVICES ────────────────────────────────────────
  "ISRG":  ["MDT", "SYK", "BSX"],
  "MDT":   ["ISRG", "SYK", "BSX"],
  "SYK":   ["ISRG", "MDT", "BSX"],
  "BSX":   ["ISRG", "MDT", "SYK"],
  "HIMS":  ["LULU", "ELF", "AMZN", "PFE", "ABBV"],
  "HOLX":  ["MDT", "SYK", "BSX", "ISRG"],
  "RMD":   ["MDT", "BSX", "SYK", "ISRG"],

  // ── MANAGED CARE / PHARMACY ────────────────────────────────────────────────
  "UNH":   ["CI", "CVS", "HUM", "MDT", "ABBV"],
  "CI":    ["UNH", "CVS", "HUM", "MDT"],
  "HUM":   ["UNH", "CI", "CVS", "MDT"],
  "CVS":   ["UNH", "CI", "HUM", "WMT"],

  // ── CONSUMER STAPLES ───────────────────────────────────────────────────────
  "KO":    ["PEP", "MDLZ", "KMB", "CL", "GIS", "HSY"],
  "PEP":   ["KO", "MDLZ", "KMB", "CL", "GIS", "HSY", "KDP"],
  "PG":    ["KO", "PEP", "CL", "KMB", "JNJ"],
  "JNJ":   ["PFE", "ABBV", "MRK", "MDT", "PG"],
  "MDLZ":  ["KO", "PEP", "HSY", "GIS", "KMB"],
  "HSY":   ["KO", "MDLZ", "GIS", "STZ", "KDP", "MNST"],
  "GIS":   ["KO", "MDLZ", "HSY", "STZ", "KDP"],
  "STZ":   ["KO", "PEP", "SAM", "MNST", "CELH", "KDP"],
  "CL":    ["KMB", "PG", "KO", "PEP"],
  "KMB":   ["CL", "PG", "KO", "PEP"],
  "MNST":  ["CELH", "KO", "PEP", "STZ", "KDP", "SAM"],
  "KDP":   ["KO", "PEP", "MNST", "STZ", "GIS", "HSY"],
  "CELH":  ["MNST", "KO", "PEP", "STZ", "SAM", "KDP"],
  "SAM":   ["CELH", "MNST", "KO", "PEP", "STZ", "KDP"],
  "FIZZ":  ["KO", "PEP", "MNST", "CELH", "KDP", "SAM"],
  "BYND":  ["GIS", "MDLZ", "KO", "PEP", "HSY"],

  // ── MATERIALS ──────────────────────────────────────────────────────────────
  "NEM":   ["FCX", "ALB", "APD", "LIN"],
  "FCX":   ["NEM", "ALB", "APD", "LIN"],
  "ALB":   ["NEM", "FCX", "APD", "LIN"],
  "APD":   ["LIN", "ALB", "NEM", "FCX"],
  "LIN":   ["APD", "ALB", "NEM", "FCX"],

  // ── ENERGY — OIL & GAS ─────────────────────────────────────────────────────
  "XOM":   ["CVX", "EOG", "OXY", "HAL", "SLB", "DVN"],
  "CVX":   ["XOM", "EOG", "OXY", "HAL", "SLB", "DVN"],
  "EOG":   ["XOM", "CVX", "OXY", "DVN", "HES"],
  "OXY":   ["XOM", "CVX", "EOG", "DVN", "HES", "HAL"],
  "HAL":   ["SLB", "BKR", "XOM", "CVX", "EOG"],
  "SLB":   ["HAL", "BKR", "XOM", "CVX"],
  "PSX":   ["VLO", "XOM", "CVX", "EOG"],
  "VLO":   ["PSX", "XOM", "CVX", "EOG"],
  "KMI":   ["XOM", "CVX", "EOG", "PSX", "VLO"],
  "DVN":   ["XOM", "CVX", "EOG", "OXY", "HES"],
  "HES":   ["XOM", "CVX", "EOG", "OXY", "DVN"],
  "BKR":   ["HAL", "SLB", "XOM", "CVX"],

  // ── ADTECH / DIGITAL MEDIA ─────────────────────────────────────────────────
  "TTD":   ["APP", "META", "SNAP", "GOOGL", "PINS"],
  "APP":   ["TTD", "META", "SNAP", "GOOGL", "PINS"],

  // ── CRYPTO / BITCOIN-PROXY ─────────────────────────────────────────────────
  "MSTR":  ["MARA", "RIOT", "CLSK", "COIN", "HOOD"],
  "MARA":  ["MSTR", "RIOT", "CLSK", "COIN", "HOOD"],
  "RIOT":  ["MARA", "MSTR", "CLSK", "COIN", "HOOD"],
  "CLSK":  ["MARA", "RIOT", "MSTR", "COIN", "HOOD"],

  // ── AI / VOICE TECH ────────────────────────────────────────────────────────
  "SOUN":  ["APP", "PLTR", "NVDA", "IBM", "MSFT"],
  "DUOL":  ["RBLX", "U", "APP", "GOOGL", "MSFT"],

  // ── CHINESE TECH ───────────────────────────────────────────────────────────
  "BABA":  ["JD", "SE", "MELI", "AMZN", "SHOP", "NU"],
  "BIDU":  ["GOOGL", "META", "AMZN", "MSFT", "BABA"],
  "JD":    ["BABA", "SE", "MELI", "AMZN", "SHOP"],

  // ── ETFS (context peers, not fundamental comps) ────────────────────────────
  "SPY":   ["QQQ", "NVDA", "AAPL", "MSFT", "AMZN"],
  "QQQ":   ["SPY", "NVDA", "AAPL", "MSFT", "META"],
};

const TICKER_TO_PRIMARY_CATEGORY = new Map(
	STAK_WEIGHTED_STOCK_TAGS.map((s) => [s.ticker.toUpperCase(), s.primaryCategory]),
);

/** Parses display strings like "$1.38T", "1.38T", "$500B AUM", "$2B" into a dollar amount. */
function parseMarketCap(value: string | undefined): number | null {
	if (!value) return null;
	const match = value.match(/\$?([\d.]+)\s*([TBM])/);
	if (!match) return null;
	const num = parseFloat(match[1]!);
	if (!isFinite(num)) return null;
	const multiplier = match[2] === "T" ? 1e12 : match[2] === "B" ? 1e9 : 1e6;
	return num * multiplier;
}

/**
 * Returns peer tickers for `ticker`. Manual overrides win outright (see above);
 * otherwise falls back to other brands sharing the same primaryCategory
 * (shared/src/stockTags.ts), ranked by closest market cap, alphabetical among
 * unparseable ones. Does not pad to `count` -- a short or empty list for a thin
 * category beats nonsensical filler.
 */
export function getPeerTickers(ticker: string, allBrands: BrandProfile[], count = 5): string[] {
	const upper = ticker.toUpperCase();
	const override = MANUAL_PEER_OVERRIDES[upper];
	if (override) return override;

	const category = TICKER_TO_PRIMARY_CATEGORY.get(upper);
	if (!category) return [];

	const target = allBrands.find((b) => b.ticker.toUpperCase() === upper);
	const targetCap = parseMarketCap(target?.financials.marketCap.value);

	const candidates = allBrands
		.filter((b) => b.ticker.toUpperCase() !== upper && TICKER_TO_PRIMARY_CATEGORY.get(b.ticker.toUpperCase()) === category)
		.map((b) => ({ ticker: b.ticker.toUpperCase(), cap: parseMarketCap(b.financials.marketCap.value) }));

	candidates.sort((a, b) => {
		const aRankable = targetCap !== null && a.cap !== null;
		const bRankable = targetCap !== null && b.cap !== null;
		if (aRankable && bRankable) return Math.abs(a.cap! - targetCap!) - Math.abs(b.cap! - targetCap!);
		if (aRankable !== bRankable) return aRankable ? -1 : 1;
		return a.ticker.localeCompare(b.ticker);
	});

	return candidates.slice(0, count).map((c) => c.ticker);
}

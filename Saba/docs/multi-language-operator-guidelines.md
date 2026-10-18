# Regional Multilingual Operator Guidelines (Hindi, Punjabi & English)

## 1. Operational Necessity for Multilingual Field Interfaces

AERIS coordinates operations across three distinct administrative jurisdictions: Punjab, Haryana, and the National Capital Territory of Delhi. While central policy analysts and control room duty officers frequently operate in English, village-level agricultural enforcement squads, local police nodal officers, and field extension agents require actionable notifications in **Punjabi (Gurmukhi)** and **Hindi (Devanagari)**.

This document outlines the localization architecture, standardized technical lexicons, and font rendering rules for the web console and SMS dispatch.

---

## 2. Standardized Trilingual Environmental Lexicon

To prevent confusion during rapid incident responses, technical environmental terms are mapped to unambiguous regional equivalents:

| English Technical Term | Hindi Equivalent (हिंदी) | Punjabi Equivalent (ਪੰਜਾਬੀ) | Operational Context |
| :--- | :--- | :--- | :--- |
| **Active Fire Cluster** | सक्रिय आग क्लस्टर | ਸਰਗਰਮ ਅੱਗ ਕਲੱਸਟਰ | Grouping of satellite thermal anomalies |
| **Smoke Plume Corridor** | धुआं प्रवाह गलियारा | ਧੂੰਏਂ ਦਾ ਲਾਂਘਾ / ਕਾਰੀਡੋਰ | Projected atmospheric advection path |
| **Estimated Arrival Time (ETA)** | अनुमानित आगमन समय | ਪਹੁੰਚਣ ਦਾ ਅੰਦਾਜ਼ਨ ਸਮਾਂ | Countdown to receptor plume impact |
| **Fire Radiative Power (FRP)** | अग्नि विकिरण शक्ति (मेगावाट) | ਅੱਗ ਰੇਡੀਏਟਿਵ ਪਾਵਰ (ਮੈਗਾਵਾਟ) | Satellite heat intensity measurement |
| **Clean-Air Shelter** | स्वच्छ वायु आश्रय | ਸਾਫ਼ ਹਵਾ ਆਸਰਾ | Facility with verified HEPA filtration |
| **Sensitive Receptor** | संवेदनशील प्रतिष्ठान | ਸੰਵੇਦਨਸ਼ੀਲ ਸਥਾਪਨਾ | Hospitals, schools, and care homes |
| **Advisory Staggering** | क्रमबद्ध चेतावनी जारी करना | ਪੜਾਅਵਾਰ ਚੇਤਾਵਨੀ | Phased notification distribution |

---

## 3. MapLibre GL Glyph & Font Rendering Pipeline

Rendering Indic scripts (Devanagari and Gurmukhi) in WebGL map canvases requires complex conjunct shaping and zero-width joiner (ZWJ) handling:

1. **Glyph PBF Generation**:
   - AERIS hosts pre-rendered SDF (Signed Distance Field) glyph ranges generated from Google Fonts **Noto Sans Devanagari** and **Noto Sans Gurmukhi**:
   - `https://assets.aeris.internal/fonts/{fontstack}/{range}.pbf`
2. **Text Shaping Pre-pass**:
   - The frontend passes GeoJSON label strings through an embedded HarfBuzz WebAssembly shaper before binding to MapLibre `symbol` layers to prevent broken ligatures on low-spec tablets.

```typescript
// MapLibre layer configuration for trilingual labels
export const receptorLabelLayer = {
  id: 'receptor-labels',
  type: 'symbol',
  source: 'receptors',
  layout: {
    'text-field': [
      'coalesce',
      ['get', `name_${currentLanguage}`], // e.g. name_pa, name_hi, name_en
      ['get', 'name']
    ],
    'text-font': ['Noto Sans Regular', 'Noto Sans Devanagari Regular', 'Noto Sans Gurmukhi Regular'],
    'text-size': 12,
    'text-variable-anchor': ['top', 'bottom', 'left', 'right']
  }
};
```

---

## 4. SMS & Telegram Dispatch Formatting Constraints

When transmitting urgent field dispatches via national SMS relays (e.g., NIC SMS Gateway):
- **Unicode GSM Constraints**: Non-ASCII messages (Hindi/Punjabi) consume 70 characters per SMS segment (compared to 160 for ASCII).
- **Template Conciseness**: SMS alerts are strictly constrained to a maximum of 2 segments (140 unicode characters) containing the cluster location, active FRP, and direct coordinates.

### Sample Field Dispatch Templates
- **English**: `[AERIS ALERT] High FRP fire cluster (340 MW) detected near Nabha (30.37N, 76.15E). Downwind smoke ETA 180 min. Patrol team dispatched.`
- **Punjabi**: `[ਏਰਿਸ ਅਲਰਟ] ਨਾਭਾ (30.37N, 76.15E) ਨੇੜੇ ਭਾਰੀ ਪਰਾਲੀ ਅੱਗ (340 MW) ਦਰਜ। ਧੂੰਏਂ ਦਾ ਲਾਂਘਾ ਪਟਿਆਲਾ ਵੱਲ। ਤੁਰੰਤ ਮੌਕੇ 'ਤੇ ਪਹੁੰਚੋ।`
- **Hindi**: `[एरिस अलर्ट] नाभा के समीप तीव्र पराली दहन (340 MW) दर्ज। धुआं गलियारा दक्षिण-पूर्व की ओर अग्रसर। फील्ड टीम तुरंत कार्रवाई करे।`

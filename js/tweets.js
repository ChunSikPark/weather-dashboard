/**
 * Tweet template library and generation engine.
 * Generates synthetic tweets based on grid_condition flags and operational data.
 */

// ── Timezone offsets (UTC hours) ──
const ISO_TZ = {
  'ERCOT': { offset: -5, label: 'Central' },
  'MISO': { offset: -5, label: 'Central' },
  'SPP': { offset: -5, label: 'Central' },
  'CAISO': { offset: -7, label: 'Pacific' },
  'Northwest': { offset: -7, label: 'Pacific' },
  'Southwest': { offset: -7, label: 'Pacific' },
  'PJM': { offset: -4, label: 'Eastern' },
  'NYISO': { offset: -4, label: 'Eastern' },
  'ISO-NE': { offset: -4, label: 'Eastern' },
  'Southeast': { offset: -4, label: 'Eastern' },
};

// ── Persona handles (rotate randomly) ──
const HANDLES = {
  operator: {
    'ERCOT': ['@ERCOT_Ops', '@ERCOT_GridStatus', '@ERCOT_Alert'],
    'CAISO': ['@CAISO_Ops', '@CAISO_GridAlert', '@CAISO_Status'],
    'PJM': ['@PJM_Ops', '@PJM_GridWatch', '@PJM_Alert'],
    'MISO': ['@MISO_Ops', '@MISO_GridStatus', '@MISO_Alert'],
    'SPP': ['@SPP_Ops', '@SPP_GridWatch', '@SPP_Alert'],
    'NYISO': ['@NYISO_Ops', '@NYISO_GridStatus', '@NYISO_Alert'],
    'ISO-NE': ['@ISONE_Ops', '@ISONE_GridWatch', '@ISONE_Alert'],
    'Northwest': ['@NW_GridOps', '@NW_PowerStatus', '@NW_GridAlert'],
    'Southeast': ['@SE_GridOps', '@SE_PowerStatus', '@SE_GridAlert'],
    'Southwest': ['@SW_GridOps', '@SW_PowerStatus', '@SW_GridAlert'],
  },
  journalist: ['@SarahEnergyBeat', '@GridWatchMike', '@PowerLineNews', '@EnergyDeskHQ'],
  citizen: {
    'ERCOT': ['@jenny_tx_mom', '@houston_dave', '@atx_carlos', '@dfw_resident'],
    'CAISO': ['@carlos_socal', '@sf_sarah', '@la_mike', '@sandiego_jen'],
    'PJM': ['@philly_joe', '@dc_commuter', '@ohio_karen', '@pittsburgh_dan'],
    'MISO': ['@midwestMark', '@chicago_lisa', '@mn_farmer', '@iowa_jen'],
    'SPP': ['@okc_thunder_fan', '@kc_resident', '@tulsa_mom', '@wichita_dave'],
    'NYISO': ['@nyc_apartment', '@brooklyn_mike', '@upstate_sara', '@queens_resident'],
    'ISO-NE': ['@dave_in_boston', '@nh_mountain', '@ct_commuter', '@maine_fisher'],
    'Northwest': ['@seattle_rain', '@portland_bike', '@boise_hiker', '@montana_ranch'],
    'Southeast': ['@atlanta_peach', '@florida_sun', '@charlotte_runner', '@nashville_music'],
    'Southwest': ['@phoenix_heat', '@abq_sunset', '@vegas_local', '@tucson_cactus'],
  },
  trader: ['@RTOTrader', '@WattStreetBets', '@ElectronAlpha', '@SparkSpreadKing'],
};

// ── Template Library ──

const TEMPLATES = {
  // ── NORMAL conditions ──
  NORMAL: {
    operator: [
      'Good {timeOfDay} from {region}. System operating normally. Demand at {demand_gw} GW, frequency {freq} Hz. All units online.',
      '{region} grid status: Normal operations. Load {demand_gw} GW, reserves at {reserve_pct}%. Next update in 1 hour.',
      'Routine update: {region} demand {demand_gw} GW. Wind {wind_gw} GW, solar {solar_gw} GW. LMP ${lmp}/MWh.',
    ],
    journalist: [
      '{region} running smooth tonight — {renewable_pct}% renewable with wind at {wind_gw} GW. Wholesale power at ${lmp}/MWh. #EnergyMarkets',
      'Quiet {timeOfDay} on the {region} grid. Demand at {demand_gw} GW with a comfortable {reserve_pct}% reserve margin. #GridWatch',
      'Market check: {region} LMP at ${lmp}/MWh. Wind carrying {wind_gw} GW, thermal filling the rest at {thermal_gw} GW. #PowerMarkets',
    ],
    citizen: [
      'Nice quiet {timeOfDay}. Power bill better be reasonable this month {region_hashtag}',
      'Just checked my smart meter — electricity is cheap right now in {region}. ${lmp}/MWh wholesale.',
    ],
    trader: [
      '{region} flat at ${lmp}/MWh. Nothing to see here. Wind at {wind_gw} GW. Boring. #PowerTrading',
      'Day-ahead clearing at ${lmp} for {region}. Renewables at {renewable_pct}%. Standard shoulder season stuff.',
    ],
  },

  // ── Minor events ──
  FREQ_ALERT: {
    operator: [
      '{region} frequency at {freq} Hz — monitoring closely. Reserves being evaluated. No public action needed at this time.',
      'Notice: {region} grid frequency dipped to {freq} Hz. Spinning reserves responding. Situation under monitoring.',
    ],
    journalist: [
      '{region} grid frequency dipped to {freq} Hz briefly. Operators monitoring but no emergency declared yet. Reserve margin at {reserve_pct}%. #GridWatch',
    ],
  },

  EEA1_CONSERVATION_APPEAL: {
    operator: [
      'CONSERVATION ALERT: {region} requests voluntary electricity reduction. Reserve margin down to {reserve_pct}%. Please limit non-essential use.',
      '{region} issues conservation appeal. Demand at {demand_gw} GW approaching available capacity. Reduce electricity use if possible.',
    ],
    journalist: [
      'JUST IN: {region} asking residents to conserve electricity. Reserves at {reserve_pct}% — not an emergency yet, but getting tight. #GridWatch',
    ],
    citizen: [
      'Just got a text from {region} saying reduce electricity use?? Its {local_time} and my AC is barely on. Whats going on?',
      'My utility app just sent a conservation alert for {region}. Should I be worried? #PowerGrid',
    ],
  },

  HIGH_RENEWABLES: {
    journalist: [
      'Impressive: {region} renewables providing {renewable_pct}% of demand right now. Wind at {wind_gw} GW, solar {solar_gw} GW. #RenewableEnergy',
      'Renewables crossed the 50% mark in {region} — {renewable_pct}% of load served by wind and solar this hour. #CleanEnergy',
    ],
  },

  RECORD_RENEWABLES: {
    journalist: [
      'RECORD: {region} renewables at {renewable_pct}% of demand! Wind {wind_gw} GW + solar {solar_gw} GW. Thermal barely needed. #RenewableEnergy',
    ],
    operator: [
      '{region} renewable output at record levels — {renewable_pct}% of demand. Monitoring frequency and interchange closely.',
    ],
  },

  RENEWABLES_EXCEED_DEMAND: {
    journalist: [
      'HISTORIC: {region} renewables now producing MORE than total demand — {renewable_pct}%! Excess power being exported. #RenewableEnergy #Milestone',
      'Incredible milestone in {region}: wind + solar output exceeds 100% of electricity demand. Renewable penetration at {renewable_pct}%. #GridWatch',
    ],
    trader: [
      '{region} renewables at {renewable_pct}% of demand. Prices collapsing to ${lmp}/MWh. Curtailment coming. Short the spark spread. #PowerTrading',
    ],
    citizen: [
      'Wait... {region} is running on MORE than 100% renewable power right now?? {renewable_pct}%!! The future is here #CleanEnergy',
    ],
  },

  LOW_RENEWABLES: {
    journalist: [
      'Quiet night for renewables in {region} — only {renewable_pct}% of demand. Thermal plants carrying {thermal_gw} GW. Wind at just {wind_gw} GW. #EnergyMix',
    ],
  },

  HIGH_PRICE: {
    trader: [
      '{region} LMP spiking to ${lmp}/MWh. Reserves at {reserve_pct}%. Getting interesting. #PowerPrices',
      'Alert: {region} real-time price ${lmp}/MWh and climbing. Demand {demand_gw} GW vs gen {gen_gw} GW. #EnergyMarkets',
    ],
    journalist: [
      'Power prices climbing in {region}: ${lmp}/MWh as demand hits {demand_gw} GW with tight reserves at {reserve_pct}%. #ElectricityPrices',
    ],
  },

  PRICE_SPIKE: {
    trader: [
      '{region} PRICE SPIKE: ${lmp}/MWh!! Reserve margin at {reserve_pct}%. This is getting ugly. #PowerPrices #GridEmergency',
      'HOLY COW — {region} real-time at ${lmp}/MWh. Scarcity pricing kicking in. Frequency at {freq} Hz. #WattStreetBets',
    ],
    journalist: [
      'BREAKING: {region} wholesale power surges to ${lmp}/MWh. Reserve margin just {reserve_pct}%. Grid stress increasing. #ElectricityPrices',
    ],
    citizen: [
      'Wholesale electricity in {region} is at ${lmp}/MWh right now?! Thats insane. My next bill is going to be brutal. #PowerPrices',
    ],
  },

  LOW_PRICE: {
    trader: [
      '{region} LMP dropped to ${lmp}/MWh. Oversupply. Wind at {wind_gw} GW flooding the market. #NegativePrices',
    ],
    journalist: [
      'Cheap power in {region}: wholesale at just ${lmp}/MWh overnight as wind output holds at {wind_gw} GW. #EnergyMarkets',
    ],
  },

  NEGATIVE_PRICE: {
    trader: [
      'NEGATIVE PRICES in {region}: ${lmp}/MWh. Wind farms paying to stay online. Curtailment imminent. #NegativePrices',
    ],
    journalist: [
      'Power prices negative in {region} at ${lmp}/MWh — generators literally paying consumers to use electricity. Renewables at {renewable_pct}%. #EnergyMarkets',
    ],
    citizen: [
      'Wait... electricity prices are NEGATIVE in {region}?? ${lmp}/MWh?? Does that mean I get paid to run my AC? #NegativePrices',
    ],
  },

  DEEP_NEGATIVE_PRICE: {
    trader: [
      'DEEP NEGATIVE: {region} at ${lmp}/MWh. Generators hemorrhaging money. Who approved this dispatch?! #PowerTrading',
    ],
    journalist: [
      'Extreme: {region} power prices hit ${lmp}/MWh. Wind farms paying ${neg_lmp}/MWh to give away electricity. System oversupplied by {overgen_pct}%. #EnergyMarkets',
    ],
  },

  OVERFREQ_ALERT: {
    operator: [
      '{region} frequency at {freq} Hz — slightly elevated. Governor response active. Monitoring generation output.',
    ],
  },

  OVERFREQ_WARNING: {
    operator: [
      'WARNING: {region} frequency elevated to {freq} Hz. Curtailing generation. Operators actively reducing output.',
    ],
    journalist: [
      'Unusual: {region} grid frequency at {freq} Hz — too MUCH power being generated. Operators scrambling to curtail. #GridWatch',
    ],
  },

  // ── Critical events ──
  FREQ_EEA1: {
    operator: [
      'ALERT: {region} declares Energy Emergency Alert Level 1. Frequency at {freq} Hz. All reserves committed. Conservation appeal in effect.',
    ],
    journalist: [
      'BREAKING: {region} declares EEA-1. Grid frequency at {freq} Hz, reserves at {reserve_pct}%. All spinning reserves deployed. #GridEmergency',
    ],
    citizen: [
      'Just heard {region} declared some kind of grid emergency?? Level 1? What does that mean? Should I turn stuff off? #PowerGrid',
    ],
  },

  FREQ_EEA2: {
    operator: [
      'EMERGENCY: {region} escalates to Energy Emergency Alert Level 2. Frequency {freq} Hz. Emergency power purchases activated. Reduce use NOW.',
    ],
    journalist: [
      'BREAKING: {region} grid emergency Level 2. Frequency at {freq} Hz. Emergency imports underway. All available generation deployed. #GridEmergency',
    ],
    citizen: [
      'Power flickered at my house. {region} is in a grid emergency?? Frequency at {freq} Hz. This is scary. #PowerOutage',
    ],
    trader: [
      '{region} EEA-2. LMP at ${lmp}/MWh and climbing. Reserve margin {reserve_pct}%. Emergency purchases across all interfaces. #GridEmergency',
    ],
  },

  FREQ_EMERGENCY: {
    operator: [
      'CRITICAL: {region} — rotating outages ordered. Frequency {freq} Hz. Reserve margin {reserve_pct}%. Follow all conservation directives.',
    ],
    journalist: [
      'BREAKING: {region} orders rolling blackouts. Grid frequency at {freq} Hz — dangerously low. Reserves at just {reserve_mw} MW ({reserve_pct}%). #RollingBlackouts',
    ],
    citizen: [
      'MY POWER IS OUT. {region} rolling blackouts. This is ridiculous. Its {local_time} and I have kids at home. #PowerOutage #{region}',
      'Just lost power in my neighborhood. {region} grid at {freq} Hz. How did we let it get this bad? #GridEmergency',
      'Lights went out at {local_time}. {region} says rolling blackouts. Great. Just great. #PowerOutage',
    ],
    trader: [
      '{region} EEA-3 DECLARED. LMP ${lmp}/MWh. Frequency {freq} Hz. Load shed underway. This is the real deal. #GridEmergency',
    ],
  },

  UFLS_IMMINENT: {
    operator: [
      'EXTREME EMERGENCY: {region} frequency approaching UFLS threshold at {freq} Hz. Automatic load shedding may activate. REDUCE ALL NON-ESSENTIAL LOAD.',
    ],
    journalist: [
      'BREAKING: {region} grid seconds from automatic blackouts. Frequency at {freq} Hz — UFLS triggers at 59.30 Hz. #GridCollapse',
    ],
    citizen: [
      'They just said on the news {region} is about to have automatic blackouts?? Frequency at {freq} Hz?? WHAT IS HAPPENING #GridEmergency',
    ],
  },

  SCARCITY_PRICING: {
    trader: [
      'SCARCITY PRICING: {region} LMP at ${lmp}/MWh. This is not a drill. Full scarcity adder. Reserve margin {reserve_pct}%. #PowerPrices',
    ],
    journalist: [
      '{region} scarcity pricing activated: ${lmp}/MWh. Thats ${lmp_per_kwh}/kWh — roughly {x_normal}x normal retail rates. #ElectricityPrices',
    ],
  },

  VOLL_CAP_PRICING: {
    trader: [
      '{region} HIT THE CAP. $5,000/MWh. Maximum allowed. Thats $5/kWh. ~40x normal. Absolute crisis. #ERCOT #PowerPrices',
    ],
    journalist: [
      'BREAKING: {region} power prices hit $5,000/MWh — the system cap. Thats $5 per kilowatt-hour, roughly 40x what you normally pay. #GridEmergency',
    ],
    citizen: [
      '$5,000 PER MEGAWATT HOUR?!? In {region}?? My electricity bill is going to be INSANE this month. How is this legal?! #PowerPrices',
    ],
  },

  EEA3_FIRM_LOAD_SHED: {
    operator: [
      'EMERGENCY: Controlled load shedding in progress across {region}. Rotating outages to stabilize grid. Stay away from downed lines.',
    ],
    journalist: [
      'BREAKING: Controlled power outages underway in {region}. Grid operator shedding load to prevent total collapse. Demand at {demand_gw} GW. #RollingBlackouts',
    ],
    citizen: [
      'Power out for 30 minutes now. {region} says controlled outages. My food in the fridge... ugh. #RollingBlackouts',
    ],
  },

  SEVERE_OVERGENERATION: {
    operator: [
      'WARNING: {region} generation exceeding demand. Curtailment orders issued. Frequency at {freq} Hz. Exporting {interchange_gw} GW to neighbors.',
    ],
    journalist: [
      '{region} has too much power — generation {overgen_pct}% above demand. Frequency pushed to {freq} Hz. Emergency curtailment underway. #GridWatch',
    ],
  },

  GENERATION_SHORTFALL: {
    operator: [
      'ALERT: {region} generation shortfall. Output at {gen_pct}% of demand. Emergency imports and demand response activated.',
    ],
    journalist: [
      '{region} facing generation shortfall — supply covering only {gen_pct}% of {demand_gw} GW demand. Emergency measures in effect. #GridEmergency',
    ],
  },

  SEVERE_GENERATION_SHORTFALL: {
    operator: [
      'CRITICAL: {region} severe generation shortfall. Output at {gen_pct}% of demand. Load shedding in effect.',
    ],
    journalist: [
      'BREAKING: {region} has lost {deficit_gw} GW of generation. Only {gen_pct}% of demand being met. Rolling outages expanded. #GridEmergency',
    ],
    citizen: [
      'How is {region} short on power by {deficit_gw} GW?? Dont we have enough power plants?? #GridEmergency #PowerOutage',
    ],
  },

  EMERGENCY_IMPORT: {
    journalist: [
      '{region} importing {interchange_gw} GW of emergency power from neighbors. Internal generation cant keep up with {demand_gw} GW demand. #GridEmergency',
    ],
  },

  MASSIVE_EXPORT: {
    journalist: [
      '{region} flooding neighbors with {interchange_gw} GW of excess power. Renewables at {renewable_pct}% of demand. #PowerGrid',
    ],
  },

  // ── Weather warnings ──
  WEATHER_WIND_SURGE: {
    journalist: [
      'WEATHER: Wind speeds surging to {wind_mph} mph across {region}. Wind farms ramping up — expect increased renewable output. #WeatherWatch',
      'Strong winds hitting {region} — {wind_mph} mph at hub height. Good news for wind generation, watch for curtailment if gusts pick up. #GridWeather',
    ],
    citizen: [
      'Its getting really windy out here in {region}. {wind_mph} mph winds. Hope the power stays on #Weather',
    ],
  },

  WEATHER_WIND_DROP: {
    journalist: [
      'WEATHER: Wind dying down across {region} — {wind_mph} mph at hub height. Thermal plants will need to pick up the slack. #GridWeather',
      'Wind speeds dropping to {wind_mph} mph in {region}. Expect wind generation to fall. Gas plants standing by. #WeatherWatch',
    ],
  },

  WEATHER_CLOUD_SURGE: {
    journalist: [
      'WEATHER: Cloud cover jumping to {cloud_pct}% across {region}. Solar output will take a hit this afternoon. #GridWeather',
      'Clouding up over {region} — {cloud_pct}% cover. Solar farms losing output. Thermal ramping to compensate. #WeatherWatch',
    ],
    citizen: [
      'Skies getting really dark here in {region}. {cloud_pct}% cloud cover. Solar panels probably not doing much right now.',
    ],
  },

  WEATHER_CLEAR_SKY: {
    journalist: [
      'Clear skies across {region} — cloud cover down to {cloud_pct}%. Solar output should be strong today. #SolarEnergy #GridWeather',
    ],
  },

  WEATHER_STORM_WARNING: {
    operator: [
      'WEATHER ADVISORY: Severe weather conditions developing across {region}. Wind {wind_mph} mph with {cloud_pct}% cloud cover. Monitoring grid stability closely.',
    ],
    journalist: [
      'WEATHER WARNING: Storm conditions in {region} — {wind_mph} mph winds, {cloud_pct}% cloud cover. Grid operators on alert for potential generation disruptions. #SevereWeather #GridWatch',
      'Severe weather moving through {region}. High winds ({wind_mph} mph) could force turbine shutdowns while heavy clouds cut solar. Double threat to renewables. #StormWatch',
    ],
    citizen: [
      'Major storm rolling through {region} right now. Wind is howling at {wind_mph} mph. Power better not go out... #SevereWeather',
      'This storm in {region} is no joke. {wind_mph} mph winds and dark as night at {local_time}. Charging my phone just in case. #StormWatch',
    ],
  },
};

// ── Helper functions ──

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getHandle(persona, iso) {
  if (persona === 'operator') {
    return pickRandom(HANDLES.operator[iso] || ['@GridOps']);
  } else if (persona === 'citizen') {
    return pickRandom(HANDLES.citizen[iso] || ['@local_resident']);
  } else if (persona === 'journalist') {
    return pickRandom(HANDLES.journalist);
  } else if (persona === 'trader') {
    return pickRandom(HANDLES.trader);
  }
  return '@unknown';
}

function formatLocalTime(datetimeStr, iso) {
  const dt = new Date(datetimeStr);
  const tz = ISO_TZ[iso] || { offset: -5, label: 'Central' };
  const local = new Date(dt.getTime() + tz.offset * 3600000);
  let h = local.getUTCHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h} ${ampm} ${tz.label}`;
}

function getTimeOfDay(datetimeStr, iso) {
  const dt = new Date(datetimeStr);
  const tz = ISO_TZ[iso] || { offset: -5, label: 'Central' };
  const localHour = (dt.getUTCHours() + tz.offset + 24) % 24;
  if (localHour >= 5 && localHour < 12) return 'morning';
  if (localHour >= 12 && localHour < 17) return 'afternoon';
  if (localHour >= 17 && localHour < 21) return 'evening';
  return 'night';
}

function getLocalHour(datetimeStr, iso) {
  const dt = new Date(datetimeStr);
  const tz = ISO_TZ[iso] || { offset: -5, label: 'Central' };
  return (dt.getUTCHours() + tz.offset + 24) % 24;
}

function fillTemplate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return vars[key] !== undefined ? vars[key] : match;
  });
}

// ── Determine severity tier ──

const CRITICAL_FLAGS = new Set([
  'FREQ_EMERGENCY', 'UFLS_IMMINENT', 'UFLS_STEP1_ACTIVE', 'UFLS_STEP2_ACTIVE',
  'CASCADING_COLLAPSE', 'EEA3_FIRM_LOAD_SHED', 'EEA3_LOAD_SHED_IMMINENT',
  'SCARCITY_PRICING', 'VOLL_CAP_PRICING', 'SEVERE_GENERATION_SHORTFALL',
  'SEVERE_OVERGENERATION', 'OFGT_GENERATOR_TRIP',
]);

const MODERATE_FLAGS = new Set([
  'FREQ_EEA1', 'FREQ_EEA2', 'EEA1_CONSERVATION_APPEAL', 'EEA2_EMERGENCY',
  'GENERATION_DEFICIT', 'GENERATION_SHORTFALL', 'OVERGENERATION',
  'HIGH_PRICE', 'PRICE_SPIKE', 'NEGATIVE_PRICE', 'DEEP_NEGATIVE_PRICE',
  'OVERFREQ_WARNING', 'OVERFREQ_SEVERE', 'EMERGENCY_IMPORT',
  'RENEWABLES_EXCEED_DEMAND', 'RECORD_RENEWABLES',
]);

const MINOR_FLAGS = new Set([
  'FREQ_ALERT', 'OVERFREQ_ALERT', 'EEA1_CONSERVATION_APPEAL',
  'HIGH_RENEWABLES', 'LOW_RENEWABLES', 'LOW_PRICE', 'MASSIVE_EXPORT',
]);

function getSeverityTier(flags) {
  for (const f of flags) {
    if (CRITICAL_FLAGS.has(f)) return 'critical';
  }
  for (const f of flags) {
    if (MODERATE_FLAGS.has(f)) return 'moderate';
  }
  for (const f of flags) {
    if (MINOR_FLAGS.has(f)) return 'minor';
  }
  return 'normal';
}

// ── Build template variables from data ──

function buildVars(gridRow, weatherRow, iso) {
  const demand = gridRow.demand_mw || 0;
  const gen = gridRow.total_generation_mw || 0;
  const lmp = gridRow.lmp_usd_per_mwh || 0;

  return {
    region: iso,
    region_hashtag: '#' + iso.replace('-', ''),
    local_time: formatLocalTime(gridRow.datetime_utc, iso),
    timeOfDay: getTimeOfDay(gridRow.datetime_utc, iso),
    freq: parseFloat(gridRow.frequency_hz || 60).toFixed(2),
    demand_gw: (demand / 1000).toFixed(1),
    wind_gw: ((gridRow.wind_generation_mw || 0) / 1000).toFixed(1),
    solar_gw: ((gridRow.solar_generation_mw || 0) / 1000).toFixed(1),
    thermal_gw: ((gridRow.thermal_generation_mw || 0) / 1000).toFixed(1),
    gen_gw: (gen / 1000).toFixed(1),
    lmp: Math.abs(lmp) >= 1 ? Math.round(lmp).toLocaleString() : lmp.toFixed(2),
    neg_lmp: Math.abs(lmp).toFixed(0),
    lmp_per_kwh: (lmp / 1000).toFixed(2),
    x_normal: Math.round(lmp / 0.12),
    reserve_mw: Math.round(gridRow.spinning_reserve_mw || 0).toLocaleString(),
    reserve_pct: parseFloat(gridRow.reserve_margin_pct || 0).toFixed(1),
    renewable_pct: Math.round(gridRow.renewable_penetration_pct || 0),
    interchange_gw: Math.abs((gridRow.net_interchange_mw || 0) / 1000).toFixed(1),
    gen_pct: demand > 0 ? Math.round((gen / demand) * 100) : 100,
    overgen_pct: demand > 0 ? Math.round(((gen - demand) / demand) * 100) : 0,
    deficit_gw: ((demand - gen) / 1000).toFixed(1),
    wind_mph: weatherRow ? parseFloat(weatherRow.wind_speed_100m_mph || 0).toFixed(0) : '?',
    cloud_pct: weatherRow ? Math.round(weatherRow.cloud_cover_pct || 0) : '?',
  };
}

// ── Main generation function ──

// Track recently used templates to avoid repeats
let _recentTemplates = [];
const MAX_RECENT = 20;

/**
 * Generate tweets for a single timestep.
 * Returns array of { handle, persona, text, timestamp }
 */
function generateTweets(gridRow, weatherRow, iso) {
  if (!gridRow) return [];

  const conditionStr = gridRow.grid_condition || 'NORMAL';
  const flags = conditionStr.split('|').map(f => f.trim());
  const tier = getSeverityTier(flags);
  const localHour = getLocalHour(gridRow.datetime_utc, iso);
  const vars = buildVars(gridRow, weatherRow, iso);

  // Determine tweet count — normal conditions produce 0 tweets
  let count;
  if (tier === 'critical') {
    count = 3 + Math.floor(Math.random() * 2); // 3-4
  } else if (tier === 'moderate') {
    count = 1 + Math.floor(Math.random() * 2); // 1-2
  } else {
    count = 0; // Normal = no tweets. Nobody posts when things are fine.
  }

  // ── Check for notable weather conditions (generates tweets even during NORMAL) ──
  const weatherFlags = [];
  if (weatherRow) {
    const windMph = parseFloat(weatherRow.wind_speed_100m_mph || 0);
    const cloudPct = parseFloat(weatherRow.cloud_cover_pct || 0);

    // Storm: high wind + high cloud
    if (windMph > 30 && cloudPct > 80) {
      weatherFlags.push('WEATHER_STORM_WARNING');
    } else if (windMph > 25) {
      weatherFlags.push('WEATHER_WIND_SURGE');
    } else if (windMph < 5 && localHour >= 8 && localHour <= 20) {
      weatherFlags.push('WEATHER_WIND_DROP');
    }

    if (cloudPct > 85 && localHour >= 8 && localHour <= 18) {
      weatherFlags.push('WEATHER_CLOUD_SURGE');
    } else if (cloudPct < 10 && localHour >= 10 && localHour <= 16) {
      weatherFlags.push('WEATHER_CLEAR_SKY');
    }
  }

  // If weather is notable, generate 1 weather tweet even during normal
  if (count === 0 && weatherFlags.length > 0 && Math.random() < 0.4) {
    count = 1;
    flags.push(...weatherFlags);
  }

  if (count === 0) return [];

  // Determine which personas speak
  const personaPool = [];
  if (tier === 'critical') {
    personaPool.push('operator', 'journalist', 'citizen', 'trader');
  } else if (tier === 'moderate') {
    personaPool.push('operator', 'journalist');
    if (flags.some(f => f.includes('PRICE') || f === 'SCARCITY_PRICING')) personaPool.push('trader');
    if (flags.some(f => f.includes('EEA') || f.includes('FREQ'))) personaPool.push('citizen');
    if (flags.some(f => f.includes('RENEWABLE'))) personaPool.push('journalist');
  } else {
    personaPool.push('operator', 'journalist');
    if (Math.random() < 0.3) personaPool.push('citizen');
    if (Math.random() < 0.3) personaPool.push('trader');
  }

  const tweets = [];
  const usedPersonas = new Set();

  for (let i = 0; i < count; i++) {
    // Pick a persona (prefer unused ones)
    let persona;
    const unused = personaPool.filter(p => !usedPersonas.has(p));
    if (unused.length > 0) {
      persona = pickRandom(unused);
    } else {
      persona = pickRandom(personaPool);
    }
    usedPersonas.add(persona);

    // Find matching templates: try each flag, fall back to NORMAL
    let template = null;
    const shuffledFlags = [...flags].sort(() => Math.random() - 0.5);

    for (const flag of shuffledFlags) {
      const flagTemplates = TEMPLATES[flag];
      if (flagTemplates && flagTemplates[persona]) {
        const candidates = flagTemplates[persona].filter(t => !_recentTemplates.includes(t));
        if (candidates.length > 0) {
          template = pickRandom(candidates);
          break;
        }
      }
    }

    // Fall back to NORMAL templates
    if (!template && TEMPLATES.NORMAL[persona]) {
      const candidates = TEMPLATES.NORMAL[persona].filter(t => !_recentTemplates.includes(t));
      if (candidates.length > 0) {
        template = pickRandom(candidates);
      } else {
        template = pickRandom(TEMPLATES.NORMAL[persona]);
      }
    }

    if (!template) continue;

    // Track recent templates
    _recentTemplates.push(template);
    if (_recentTemplates.length > MAX_RECENT) _recentTemplates.shift();

    const text = fillTemplate(template, vars);
    const handle = getHandle(persona, iso);

    // Generate a fake timestamp offset (within the hour)
    const dt = new Date(gridRow.datetime_utc);
    dt.setMinutes(Math.floor(Math.random() * 55) + i);
    const tz = ISO_TZ[iso] || { offset: -5 };
    const localDt = new Date(dt.getTime() + tz.offset * 3600000);
    let h = localDt.getUTCHours();
    const ampm = h >= 12 ? 'p' : 'a';
    h = h % 12 || 12;
    const m = String(localDt.getUTCMinutes()).padStart(2, '0');
    const timeStr = `${h}:${m}${ampm}`;

    tweets.push({ handle, persona, text, time: timeStr });
  }

  return tweets;
}

/**
 * Reset recent template tracking (call when ISO changes).
 */
function resetTweetHistory() {
  _recentTemplates = [];
}

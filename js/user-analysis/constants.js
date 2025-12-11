// ==================== CONSTANTS AND CONFIGURATION ====================

export const LOGODEV_API_KEY = 'pk_Mugixd0DTQO4N80QR6b0_g';

export const osmTags = {
    popularLocations: 'tourism=attraction|leisure=park|shop=department_store|shop=mall',
    school: "amenity=school|amenity=university|amenity=college",
    hospital: "amenity=hospital|amenity=clinic|healthcare=hospital",
    fast_food: "amenity=fast_food|amenity=restaurant",
    supermarket: "shop=supermarket|shop=grocery|shop=convenience",
    shopping_mall: "shop=mall|shop=department_store",
    coffee_shop: "amenity=cafe|shop=coffee",
    gas_station: "amenity=fuel|shop=gas",
    police_station: "amenity=police",
    fire_station: "amenity=fire_station",
    bank: "amenity=bank",
    atm: "amenity=atm",
    park: "leisure=park|leisure=garden",
    pharmacy: "amenity=pharmacy|shop=pharmacy|shop=chemist",
    gym: "leisure=fitness_centre|leisure=sports_centre|leisure=gym|amenity=gym"
};

export const categoryIcons = {
    popularLocations: "⭐",
    school: "🏫",
    hospital: "🏥",
    fast_food: "🍔",
    supermarket: "🛒",
    shopping_mall: "🏬",
    coffee_shop: "☕",
    gas_station: "⛽",
    police_station: "👮",
    fire_station: "🚒",
    bank: "🏦",
    atm: "💳",
    park: "🌳",
    pharmacy: "💊",
    gym: "💪"
};

export const FAMOUS_LOCATIONS = [
    // Famous Landmarks
    'Statue of Liberty', 'Grand Canyon', 'Times Square',
    'Golden Gate Bridge', 'Empire State Building', 'White House',
    'Disney World', 'Disneyland', 'Universal Studios', 'Space Needle',
    'Central Park', 'Navy Pier', 'Pike Place Market', 'Fenway Park',
    
    // Major Shopping Centers
    'Mall of America', 'King of Prussia Mall', 'South Coast Plaza',
    'Aventura Mall', 'The Grove', 'Tysons Corner Center',
    
    // Universities
    'Harvard University', 'Stanford University', 'MIT',
    'Yale University', 'Princeton University',
    
    // Medical Centers
    'Mayo Clinic', 'Cleveland Clinic', 'Johns Hopkins Hospital',
];

// Grid clustering configuration
export const GRID_ROWS = 5;
export const GRID_COLS = 5;
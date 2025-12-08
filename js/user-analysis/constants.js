// ==================== CONSTANTS AND CONFIGURATION ====================

export const LOGODEV_API_KEY = 'pk_Mugixd0DTQO4N80QR6b0_g';

export const osmTags = {
    popularLocations: 'tourism=attraction|amenity=community_centre|leisure=park|shop=department_store',
    school: "amenity=school",
    hospital: "amenity=hospital",
    fast_food: "amenity=fast_food",
    supermarket: "shop=supermarket",
    shopping_mall: "shop=mall",
    coffee_shop: "amenity=cafe"
};

export const categoryIcons = {
    popularLocations: "⭐",
    school: "🏫",
    hospital: "🏥",
    fast_food: "🍔",
    supermarket: "🛒",
    shopping_mall: "🏬",
    coffee_shop: "☕"
};

export const FAMOUS_LOCATIONS = {
    popularLocations: [
        'Walmart', 'Target', 'Costco', 'Best Buy', 'Apple Store',
        'Nordstrom', 'Macy\'s', 'Home Depot', 'Lowe\'s', 'CVS Pharmacy',
        'Walgreens', 'Statue of Liberty', 'Grand Canyon', 'Times Square',
        'Golden Gate Bridge', 'Empire State Building', 'White House',
        'Disney World', 'Disneyland', 'Universal Studios', 'Space Needle',
        'Central Park', 'Navy Pier', 'Pike Place Market', 'Fenway Park'
    ],
    school: [
        'Harvard University', 'Stanford University', 'Massachusetts Institute of Technology',
        'California Institute of Technology', 'Princeton University', 'Yale University',
        'Columbia University', 'University of Chicago', 'University of Pennsylvania',
        'Cornell University', 'Duke University', 'Johns Hopkins University'
    ],
    hospital: [
        'Mayo Clinic', 'Cleveland Clinic', 'Johns Hopkins Hospital',
        'Massachusetts General Hospital', 'UCLA Medical Center', 'NYU Langone Health',
        'Cedars-Sinai Medical Center', 'Stanford Health Care', 'UCSF Medical Center',
        'Northwestern Memorial Hospital'
    ],
    fast_food: [
        'McDonald\'s', 'Starbucks', 'Subway', 'Taco Bell', 'Burger King',
        'Wendy\'s', 'Chick-fil-A', 'Domino\'s', 'Pizza Hut', 'KFC',
        'Chipotle', 'Panera Bread', 'Five Guys', 'In-N-Out Burger'
    ],
    supermarket: [
        'Walmart', 'Target', 'Kroger', 'Albertsons', 'Safeway', 'Publix',
        'Whole Foods Market', 'Trader Joe\'s', 'Aldi', 'Costco'
    ],
    shopping_mall: [
        'Mall of America', 'King of Prussia Mall', 'South Coast Plaza',
        'Aventura Mall', 'The Grove', 'Tysons Corner Center'
    ],
    coffee_shop: [
        'Starbucks', 'Dunkin\'', 'Peet\'s Coffee', 'Tim Hortons',
        'Caribou Coffee', 'Dutch Bros', 'Blue Bottle Coffee'
    ]
};

// Grid clustering configuration
export const GRID_ROWS = 5;
export const GRID_COLS = 5;
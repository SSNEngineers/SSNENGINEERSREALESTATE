// js/admin-analysis/constants.js
export const LOGODEV_API_KEY = 'pk_Mugixd0DTQO4N80QR6b0_g';
export const MAX_POIS_PER_CATEGORY = 5;
export const MAX_RADIUS_MILES = 3;

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

// Famous Locations
export const FAMOUS_LOCATIONS = {
    school: [
        'Harvard University', 'Stanford University', 'Massachusetts Institute of Technology',
        'California Institute of Technology', 'Princeton University', 'Yale University',
        'Columbia University', 'University of Chicago', 'University of Pennsylvania',
        'Cornell University', 'Duke University', 'Johns Hopkins University',
        'Northwestern University', 'University of California, Berkeley',
        'University of California, Los Angeles', 'University of Michigan',
        'University of Virginia', 'Georgetown University', 'New York University',
        'University of Southern California', 'University of North Carolina at Chapel Hill',
        'University of Texas at Austin', 'University of Wisconsin-Madison',
        'University of Illinois Urbana-Champaign', 'University of Washington',
        'University of Florida', 'Ohio State University', 'Pennsylvania State University',
        'Arizona State University', 'Indiana University', 'Michigan State University',
        'Texas A&M University', 'Purdue University', 'University of Georgia',
        'Boston University', 'Tufts University', 'Emory University',
        'Vanderbilt University', 'Rice University', 'University of Notre Dame',
        'Carnegie Mellon University', 'University of California, San Diego',
        'University of California, Davis', 'University of Maryland',
        'University of Pittsburgh', 'University of Colorado Boulder',
        'University of Arizona', 'University of Iowa', 'University of Minnesota',
        'University of Oregon', 'University of Utah', 'Washington University in St. Louis'
    ],
    hospital: [
        'Mayo Clinic', 'Cleveland Clinic', 'Johns Hopkins Hospital',
        'Massachusetts General Hospital', 'UCLA Medical Center', 'NYU Langone Health',
        'Cedars-Sinai Medical Center', 'Stanford Health Care', 'UCSF Medical Center',
        'Northwestern Memorial Hospital', 'University of Michigan Hospital',
        'Barnes-Jewish Hospital', 'Duke University Hospital', 'Mount Sinai Hospital',
        'NewYork-Presbyterian Hospital', 'Brigham and Women\'s Hospital',
        'Emory University Hospital', 'Vanderbilt University Medical Center',
        'University of Pittsburgh Medical Center', 'Houston Methodist Hospital'
    ],
    fast_food: [
        'McDonald\'s', 'Starbucks', 'Subway', 'Taco Bell', 'Burger King',
        'Wendy\'s', 'Chick-fil-A', 'Domino\'s', 'Pizza Hut', 'KFC',
        'Chipotle', 'Panera Bread', 'Dairy Queen', 'Sonic Drive-In',
        'Arby\'s', 'Little Caesars', 'Popeyes', 'Jack in the Box',
        'Jimmy John\'s', 'Five Guys', 'Papa John\'s', 'Whataburger',
        'In-N-Out Burger', 'Culver\'s', 'Raising Cane\'s', 'Shake Shack'
    ],
    supermarket: [
        'Kroger', 'Albertsons', 'Safeway', 'Publix', 'H-E-B', 'Meijer',
        'Aldi', 'Trader Joe\'s', 'Whole Foods Market', 'Wegmans',
        'Hy-Vee', 'Giant Food', 'Stop & Shop', 'Food Lion',
        'Harris Teeter', 'Vons', 'Jewel-Osco', 'Ralphs'
    ],
    shopping_mall: [
        'Mall of America', 'King of Prussia Mall', 'Mall at Short Hills',
        'Roosevelt Field', 'South Coast Plaza', 'Aventura Mall',
        'The Grove', 'Woodfield Mall', 'Mall at Millenia',
        'Lenox Square', 'Phipps Plaza', 'Fashion Show Mall',
        'The Forum Shops', 'Macy\'s Herald Square', 'Tysons Corner Center'
    ],
    coffee_shop: [
        'Starbucks', 'Dunkin\'', 'Peet\'s Coffee', 'Tim Hortons',
        'Caribou Coffee', 'Dutch Bros', 'Blue Bottle Coffee',
        'Philz Coffee', 'The Coffee Bean & Tea Leaf',
        'Stumptown Coffee Roasters', 'Intelligentsia Coffee', 'La Colombe'
    ],
    popularLocations: [
        'Walmart', 'Target', 'Costco', 'Best Buy', 'Apple Store',
        'Nordstrom', 'Macy\'s', 'Home Depot', 'Lowe\'s', 'CVS Pharmacy',
        'Walgreens', 'Statue of Liberty', 'Grand Canyon', 'Times Square',
        'Golden Gate Bridge', 'Empire State Building', 'White House',
        'Disney World', 'Disneyland', 'Universal Studios', 'Space Needle',
        'Central Park', 'Navy Pier', 'Pike Place Market', 'Fenway Park'
    ]
};
// ============================================================================
// FIELD DEFINITIONS - Reusable field configurations
// ============================================================================

const fieldDefinitions = {
  // Common fields used across multiple character types
  type: {
    id: 'type',
    label: 'Type',
    type: 'select',
    options: [
      'Human',
      'Animal',
      'Mythical Creature',
      'Robot',
      'Alien',
      'Plant',
      'Insect',
      'Reptile',
      'Amphibian',
      'Fish',
      'Unknown',
    ],
  },

  gender: {
    id: 'gender',
    label: 'Gender',
    type: 'select',
    options: ['Female', 'Male', 'Non-Binary', 'Not Defined'],
  },

  // Age field for Humans (text input)
  age: {
    id: 'age',
    label: 'Age',
    type: 'text',
  },

  // Age field for Animals (select with life stages)
  ageAnimal: {
    id: 'age',
    label: 'Age',
    type: 'select',
    options: ['Baby', 'Young', 'Juvenile', 'Adult', 'Elder'],
  },

  // Age field for Reptiles (select with life stages)
  ageReptile: {
    id: 'age',
    label: 'Age',
    type: 'select',
    options: [
      'Hatchling',
      'Juvenile',
      'Young Adult',
      'Adult',
      'Mature',
      'Ancient',
    ],
  },

  // Age field for Amphibians (select with life stages)
  ageAmphibian: {
    id: 'age',
    label: 'Age',
    type: 'select',
    options: [
      'Tadpole',
      'Juvenile',
      'Young Adult',
      'Adult',
      'Mature',
      'Ancient',
    ],
  },

  // Age field for Fish (select with life stages)
  ageFish: {
    id: 'age',
    label: 'Age',
    type: 'select',
    options: ['Fry', 'Juvenile', 'Young Adult', 'Adult', 'Mature', 'Ancient'],
  },

  // Age field for Mythical Creatures (select with life stages)
  ageMythical: {
    id: 'age',
    label: 'Age',
    type: 'select',
    options: ['Young', 'Adult', 'Ancient', 'Immortal'],
  },

  // Age field for Aliens (select with life stages)
  ageAlien: {
    id: 'age',
    label: 'Age',
    type: 'select',
    options: ['Young', 'Adult', 'Elder', 'Ancient', 'Timeless'],
  },

  // Age field for Robots (select with operational stages)
  ageRobot: {
    id: 'age',
    label: 'Age',
    type: 'select',
    options: ['New', 'Young', 'Mature', 'Veteran', 'Legacy'],
  },

  // Age field for Plants (select with growth stages)
  agePlant: {
    id: 'age',
    label: 'Age',
    type: 'select',
    options: ['Seedling', 'Young', 'Mature', 'Ancient', 'Timeless'],
  },

  // Age field for Insects (select with life stages)
  ageInsect: {
    id: 'age',
    label: 'Age',
    type: 'select',
    options: ['Larva', 'Pupa', 'Young Adult', 'Adult', 'Mature', 'Ancient'],
  },

  // Age field for Unknown types (select with general stages)
  ageUnknown: {
    id: 'age',
    label: 'Age',
    type: 'select',
    options: [
      'Baby',
      'Young',
      'Juvenile',
      'Young Adult',
      'Adult',
      'Mature',
      'Ancient',
    ],
  },

  height: {
    id: 'height',
    label: 'Height',
    type: 'text',
  },

  weight: {
    id: 'weight',
    label: 'Weight',
    type: 'text',
  },

  // Species field (used by non-human types)
  species: {
    id: 'species',
    label: 'Species',
    type: 'select',
    options: [], // Will be populated dynamically
  },

  // Dynamic breed field
  race_breed: {
    id: 'race_breed',
    label: 'Breed',
    type: 'select',
    options: [],
    dynamicOptions: true,
  },

  // Human-specific fields
  ethnicity: {
    id: 'race_breed',
    label: 'Ethnicity',
    type: 'select',
    options: [
      'African',
      'European',
      'Middle Eastern / Arab',
      'Slavic',
      'Turkish',
      'Indian',
      'East Asian',
      'Southeast Asian',
      'Central Asian',
      'Indigenous Peoples of the Americas',
      'Pacific Islanders',
      'Aboriginal Australian',
      'Jewish',
    ],
  },

  skinColor: {
    id: 'skinColor',
    label: 'Skin color',
    type: 'select',
    options: ['Pale', 'Tan', 'Brown', 'Dark', 'Grey', 'Pink'],
  },

  eyes: {
    id: 'eyes',
    label: 'Eyes',
    type: 'custom-eyes',
    shapeOptions: [
      'Round',
      'Almond',
      'Slit (cat-like)',
      'Droopy',
      'Sharp',
      'Angular',
      'Bulging',
      'Closed',
      'Narrow',
    ],
    colorOptions: [
      'Green',
      'Blue',
      'Brown',
      'Hazel',
      'Grey',
      'Amber',
      'Red',
      'Purple',
    ],
  },

  facialStructure: {
    id: 'facialStructure',
    label: 'Facial structure',
    type: 'select',
    options: [
      'Flat face',
      'Long muzzle',
      'Wide jaw',
      'Pointed snout',
      'Chubby cheeks',
      'Sharp cheekbones',
      'Beak (if bird)',
    ],
  },

  // Human-specific body build field
  bodyBuild: {
    id: 'bodyBuild',
    label: 'Body build',
    type: 'select',
    options: [
      'Slim',
      'Petite',
      'Athletic',
      'Stocky',
      'Muscular',
      'Chubby',
      'Lanky',
    ],
  },

  // Human-specific hair field
  coveringHuman: {
    id: 'coveringHairFurEtc',
    label: 'Hair',
    type: 'select',
    options: [
      'Bald',
      'Short hair',
      'Long hair',
      'Straight hair',
      'Wavy hair',
      'Curly hair',
      'Coily hair',
      'Buzz cut',
      'Afro',
      'Ponytail',
    ],
  },

  // Insect-specific body build field
  bodyBuildInsect: {
    id: 'bodyBuild',
    label: 'Body build',
    type: 'select',
    options: [
      'Slender',
      'Compact',
      'Segmented',
      'Spherical',
      'Elongated',
      'Winged',
      'Armored',
      'Flexible',
    ],
  },

  // Insect-specific facial structure field
  facialStructureInsect: {
    id: 'facialStructure',
    label: 'Facial structure',
    type: 'select',
    options: [
      'Mandibles',
      'Proboscis',
      'Antennae',
      'Compound Eyes',
      'Simple Eyes',
      'Fangs',
      'Stinger',
      'Spinnerets',
    ],
  },

  // Animal-specific covering field
  coveringAnimal: {
    id: 'coveringHairFurEtc',
    label: 'Fur',
    type: 'select',
    options: [
      'None',
      'Bald',
      'Short Fur',
      'Long Fur',
      'Curly Fur',
      'Feathers',
      'Scales',
    ],
  },

  // Reptile-specific covering field
  coveringReptile: {
    id: 'coveringHairFurEtc',
    label: 'Covering',
    type: 'select',
    options: [
      'Scales',
      'Smooth Scales',
      'Rough Scales',
      'Keeled Scales',
      'Granular Scales',
      'Plates',
      'Scutes',
      'Carapace',
      'Plastron',
      'Shell',
      'Skin',
      'Leathery',
    ],
  },

  // Amphibian-specific covering field
  coveringAmphibian: {
    id: 'coveringHairFurEtc',
    label: 'Covering',
    type: 'select',
    options: [
      'Smooth Skin',
      'Warty Skin',
      'Moist Skin',
      'Dry Skin',
      'Granular Skin',
      'Bumpy Skin',
      'Slimy',
      'Rough',
    ],
  },

  // Mythical Creature-specific covering field (dynamic)
  coveringMythical: {
    id: 'coveringHairFurEtc',
    label: 'Covering',
    type: 'select',
    options: [],
    dynamicOptions: true,
  },

  // Unknown type covering field (all options combined)
  coveringUnknown: {
    id: 'coveringHairFurEtc',
    label: 'Covering',
    type: 'select',
    options: [
      // Animal options
      'None',
      'Bald',
      'Short Fur',
      'Long Fur',
      'Curly Fur',
      'Feathers',
      'Scales',
      // Reptile options
      'Smooth Scales',
      'Rough Scales',
      'Keeled Scales',
      'Granular Scales',
      'Plates',
      'Scutes',
      'Carapace',
      'Plastron',
      'Shell',
      'Skin',
      'Leathery',
      // Amphibian options
      'Smooth Skin',
      'Warty Skin',
      'Moist Skin',
      'Dry Skin',
      'Granular Skin',
      'Bumpy Skin',
      'Slimy',
      'Rough',
      // Additional options
      'Hair',
      'Chitin',
      'Crystalline',
      'Ethereal',
      'Bioluminescent',
      'Metallic',
      'Gossamer',
      'Silk',
      'Light',
      'Sparkles',
      'Glow',
    ],
  },

  // Robot-specific fields
  modelSeries: {
    id: 'species',
    label: 'Model Series',
    type: 'select',
    options: [],
  },

  // Special field for Unknown type - contains all species from all types
  speciesAll: {
    id: 'species',
    label: 'Species',
    type: 'select',
    options: [
      // Animal species
      'Cat',
      'Dog',
      'Horse',
      'Bird',
      'Bear',
      'Rabbit',
      'Fox',
      'Wolf',
      // Reptile species
      'Snake',
      'Lizard',
      'Crocodile',
      'Turtle',
      'Gecko',
      // Amphibian species
      'Frog',
      'Toad',
      'Salamander',
      'Newt',
      // Fish species
      'Freshwater Fish',
      'Saltwater Fish',
      'Shark',
      'Ray',
      // Robot species (Model Series)
      'Mecha Series A',
      'Android Type-7',
      'Cyborg Model X',
      'Synthetic Humanoid',
      // Alien species
      'Bioluminoid',
      'Zeta Reticulan',
      'Pleiadians',
      'Arcturian',
      'Nordic',
      'Insectoid',
      // Plant species
      'Tree',
      'Flower',
      'Vine',
      'Mushroom',
      'Grass',
      'Shrub',
      'Bamboo',
      'Seaweed',
      'Coral',
      'Moss',
      'Lichen',
      // Insect species
      'Bee',
      'Butterfly',
      'Ant',
      'Spider',
      'Beetle',
      'Moth',
      'Dragonfly',
      'Cricket',
      'Grasshopper',
      'Ladybug',
      'Firefly',
      'Wasp',
      'Hornet',
      'Mosquito',
      'Fly',
      'Cockroach',
      'Termite',
      'Centipede',
      'Millipede',
      'Scorpion',
      // Mythical Creature species
      'Dragon',
      'Elf',
      'Orc',
      'Fairy',
      'Pixie',
      'Sprite',
      'Goblin',
      'Troll',
      'Gnome',
      'Dwarf',
      'Halfling',
      'Centaur',
      'Minotaur',
      'Satyr',
      'Nymph',
      'Dryad',
      'Siren',
      'Mermaid',
      'Unicorn',
      'Phoenix',
      'Griffin',
      'Pegasus',
      'Chimera',
    ],
  },
};

// ============================================================================
// SPECIES TO TYPE MAPPING
// ============================================================================

const speciesToTypeMapping = {
  // Animal species
  Cat: 'Animal',
  Dog: 'Animal',
  Horse: 'Animal',
  Bird: 'Animal',
  Bear: 'Animal',
  Rabbit: 'Animal',
  Fox: 'Animal',
  Wolf: 'Animal',

  // Reptile species
  Snake: 'Reptile',
  Crocodile: 'Reptile',
  Lizard: 'Reptile',
  Turtle: 'Reptile',
  Gecko: 'Reptile',

  // Amphibian species
  Frog: 'Amphibian',
  Toad: 'Amphibian',
  Salamander: 'Amphibian',
  Newt: 'Amphibian',

  // Fish species
  'Freshwater Fish': 'Fish',
  'Saltwater Fish': 'Fish',
  Shark: 'Fish',
  Ray: 'Fish',

  // Robot models
  'Mecha Series A': 'Robot',
  'Android Type-7': 'Robot',
  'Cyborg Model X': 'Robot',
  'Synthetic Humanoid': 'Robot',

  // Plant types
  Tree: 'Plant',
  Flower: 'Plant',
  Grass: 'Plant',
  Shrub: 'Plant',

  // Insect types
  Bee: 'Insect',
  Butterfly: 'Insect',
  Ant: 'Insect',
  Spider: 'Insect',

  // Mythical creatures
  Dragon: 'Mythical Creature',
  Phoenix: 'Mythical Creature',
  Unicorn: 'Mythical Creature',
  Griffin: 'Mythical Creature',

  // Alien species
  'Grey Alien': 'Alien',
  Reptilian: 'Alien',
  Nordic: 'Alien',
  Insectoid: 'Alien',
};

// ============================================================================
// SPECIES TO BREED MAPPING
// ============================================================================

const speciesToBreedMapping = {
  // Animal breeds
  Cat: [
    'Orange Tabby',
    'Siamese',
    'Persian',
    'Maine Coon',
    'Sphynx',
    'British Shorthair',
    'Ragdoll',
    'Bengal',
  ],

  Dog: [
    'Golden Retriever',
    'German Shepherd',
    'Shiba Inu',
    'Labrador',
    'Poodle',
    'Bulldog',
    'Beagle',
    'Husky',
  ],

  Horse: [
    'Arabian',
    'Thoroughbred',
    'Quarter Horse',
    'Clydesdale',
    'Mustang',
    'Friesian',
  ],

  Bird: ['Parrot', 'Eagle', 'Owl', 'Falcon', 'Canary', 'Finch', 'Cockatoo'],

  Bear: [
    'Grizzly Bear',
    'Polar Bear',
    'Black Bear',
    'Panda Bear',
    'Brown Bear',
  ],

  Rabbit: [
    'Holland Lop',
    'Netherland Dwarf',
    'Flemish Giant',
    'Lionhead',
    'Rex',
  ],

  Fox: ['Red Fox', 'Arctic Fox', 'Fennec Fox', 'Gray Fox', 'Silver Fox'],

  Wolf: ['Gray Wolf', 'Arctic Wolf', 'Red Wolf', 'Timber Wolf', 'Mexican Wolf'],

  // Reptile breeds
  Snake: ['Python', 'Cobra', 'Viper', 'Rattlesnake', 'Boa', 'Garter Snake'],

  Lizard: ['Gecko', 'Iguana', 'Chameleon', 'Monitor Lizard', 'Bearded Dragon'],

  Crocodile: [
    'Nile Crocodile',
    'American Alligator',
    'Saltwater Crocodile',
    'Dwarf Crocodile',
  ],

  Turtle: [
    'Red-Eared Slider',
    'Box Turtle',
    'Sea Turtle',
    'Tortoise',
    'Painted Turtle',
  ],

  Gecko: ['Leopard Gecko', 'Crested Gecko', 'Tokay Gecko', 'House Gecko'],

  // Amphibian breeds
  Frog: [
    'Tree Frog',
    'Poison Dart Frog',
    'Bullfrog',
    'Leopard Frog',
    'Red-eyed Tree Frog',
  ],

  Toad: [
    'American Toad',
    "Fowler's Toad",
    'Great Plains Toad',
    "Woodhouse's Toad",
  ],

  Salamander: [
    'Fire Salamander',
    'Tiger Salamander',
    'Spotted Salamander',
    'Red Salamander',
  ],

  Newt: [
    'Eastern Newt',
    'Rough-skinned Newt',
    'California Newt',
    'Alpine Newt',
  ],

  // Fish breeds
  'Freshwater Fish': [
    'Goldfish',
    'Betta',
    'Guppy',
    'Angelfish',
    'Tetra',
    'Cichlid',
  ],

  'Saltwater Fish': ['Clownfish', 'Tropical Fish', 'Shark', 'Ray', 'Eel'],

  Shark: [
    'Great White Shark',
    'Hammerhead Shark',
    'Tiger Shark',
    'Whale Shark',
    'Bull Shark',
  ],

  Ray: ['Manta Ray', 'Stingray', 'Electric Ray', 'Eagle Ray', 'Devil Ray'],

  // Robot models
  'Mecha Series A': [
    'Combat Model',
    'Utility Model',
    'Reconnaissance Model',
    'Heavy Assault Model',
  ],

  'Android Type-7': [
    'Service Android',
    'Companion Android',
    'Security Android',
    'Medical Android',
  ],

  'Cyborg Model X': [
    'Combat Cyborg',
    'Medical Cyborg',
    'Industrial Cyborg',
    'Research Cyborg',
  ],

  'Synthetic Humanoid': [
    'Alpha Series',
    'Beta Series',
    'Gamma Series',
    'Delta Series',
  ],

  // Plant types
  Tree: ['Oak', 'Maple', 'Pine', 'Willow', 'Cherry', 'Apple'],

  Flower: ['Rose', 'Tulip', 'Sunflower', 'Orchid', 'Lily'],

  Grass: [
    'Bermuda Grass',
    'Kentucky Bluegrass',
    'Fescue',
    'Zoysia',
    'St. Augustine',
  ],

  Shrub: ['Rose Bush', 'Boxwood', 'Azalea', 'Hydrangea', 'Lilac'],

  // Insect types
  Bee: ['Honey Bee', 'Bumble Bee', 'Carpenter Bee', 'Mason Bee'],

  Butterfly: ['Monarch', 'Swallowtail', 'Morpho', 'Painted Lady'],

  Ant: ['Fire Ant', 'Carpenter Ant', 'Black Ant', 'Red Ant', 'Bullet Ant'],

  Spider: [
    'Black Widow',
    'Brown Recluse',
    'Tarantula',
    'Jumping Spider',
    'Wolf Spider',
  ],

  // Mythical creatures
  Dragon: [
    'Fire Dragon',
    'Ice Dragon',
    'Lightning Dragon',
    'Earth Dragon',
    'Water Dragon',
  ],

  Phoenix: ['Fire Phoenix', 'Golden Phoenix', 'Crystal Phoenix'],

  Unicorn: [
    'White Unicorn',
    'Rainbow Unicorn',
    'Shadow Unicorn',
    'Crystal Unicorn',
  ],

  Griffin: [
    'Golden Griffin',
    'Silver Griffin',
    'Bronze Griffin',
    'Storm Griffin',
  ],

  // Alien species
  'Grey Alien': ['Tall Grey', 'Short Grey', 'Hybrid Grey'],

  Reptilian: ['Alpha Reptilian', 'Beta Reptilian', 'Gamma Reptilian'],

  Nordic: ['Tall Nordic', 'Blonde Nordic', 'Warrior Nordic', 'Scholar Nordic'],

  Insectoid: [
    'Mantis Insectoid',
    'Beetle Insectoid',
    'Ant Insectoid',
    'Wasp Insectoid',
  ],
};

// ============================================================================
// SPECIES TO COVERING MAPPING (for animals)
// ============================================================================

const speciesToCoveringMapping = {
  // Animal species
  Cat: ['Fur', 'Hairless'],
  Dog: ['Fur', 'Hairless'],
  Horse: ['Fur', 'Mane'],
  Bird: ['Feathers', 'Scales'],
  Bear: ['Fur'],
  Rabbit: ['Fur'],
  Fox: ['Fur'],
  Wolf: ['Fur'],

  // Reptile species
  Snake: ['Scales'],
  Lizard: ['Scales'],
  Crocodile: ['Scales'],
  Turtle: ['Shell', 'Scales'],
  Gecko: ['Scales'],

  // Amphibian species
  Frog: ['Skin'],
  Toad: ['Skin'],
  Salamander: ['Skin'],
  Newt: ['Skin'],

  // Fish species
  'Freshwater Fish': ['Scales'],
  'Saltwater Fish': ['Scales'],
  Shark: ['Scales'],
  Ray: ['Scales'],

  // Mythical Creature species
  Dragon: [
    'Scales',
    'Dragon Hide',
    'Crystalline',
    'Metallic',
    'Leathery',
    'Feathers',
    'Spines',
    'Plates',
  ],
  Elf: [
    'Hair',
    'Silk',
    'Ethereal',
    'Crystalline',
    'Golden',
    'Silver',
    'Moonlit',
    'Starlight',
  ],
  Orc: [
    'Hair',
    'Leather',
    'Hide',
    'Scars',
    'Tattoos',
    'War Paint',
    'Bone',
    'Metal',
  ],
  Fairy: [
    'Ethereal',
    'Gossamer',
    'Silk',
    'Feathers',
    'Crystalline',
    'Light',
    'Sparkles',
    'Glow',
  ],
  Pixie: [
    'Gossamer',
    'Silk',
    'Feathers',
    'Crystalline',
    'Light',
    'Sparkles',
    'Glow',
  ],
  Sprite: ['Ethereal', 'Gossamer', 'Silk', 'Crystalline', 'Light', 'Sparkles'],
  Goblin: ['Hair', 'Leather', 'Hide', 'Scars', 'Tattoos', 'Bone'],
  Troll: ['Hair', 'Leather', 'Hide', 'Scars', 'Bone', 'Stone'],
  Gnome: ['Hair', 'Beard', 'Leather', 'Hide'],
  Dwarf: ['Hair', 'Beard', 'Leather', 'Hide', 'Metal'],
  Halfling: ['Hair', 'Fur', 'Leather'],
  Centaur: ['Hair', 'Fur', 'Leather'],
  Minotaur: ['Hair', 'Fur', 'Leather', 'Hide'],
  Satyr: ['Hair', 'Fur', 'Leather'],
  Nymph: ['Hair', 'Silk', 'Ethereal', 'Crystalline', 'Light'],
  Dryad: ['Bark', 'Leaves', 'Wood', 'Crystalline', 'Ethereal'],
  Siren: ['Hair', 'Scales', 'Feathers', 'Ethereal'],
  Mermaid: ['Hair', 'Scales', 'Feathers', 'Ethereal'],
  Unicorn: ['Hair', 'Fur', 'Ethereal', 'Crystalline', 'Light', 'Sparkles'],
  Phoenix: ['Feathers', 'Fire', 'Crystalline', 'Ethereal', 'Light'],
  Griffin: ['Feathers', 'Fur', 'Scales', 'Leather'],
  Pegasus: ['Hair', 'Fur', 'Feathers', 'Ethereal', 'Light'],
  Chimera: ['Hair', 'Fur', 'Scales', 'Feathers', 'Leather'],
};

// ============================================================================
// CHARACTER TYPE CONFIGURATIONS
// ============================================================================

const characterTypeConfigs = {
  Human: {
    label: 'Human',
    fields: [
      'type',
      'gender',
      'ethnicity', // Uses race_breed field with ethnicity options
      'age', // Text input for humans
      'height',
      'weight',
      'skinColor',
      'eyes',
      'facialStructure',
      'bodyBuild', // Human-specific body build options
      'coveringHuman', // Human-specific hair options
    ],
    speciesField: null, // Humans don't have species
    breedField: null, // Humans use ethnicity instead
  },

  Animal: {
    label: 'Animal',
    fields: [
      'type',
      'species',
      'gender',
      'race_breed',
      'ageAnimal', // Select with life stages
      'height',
      'weight',
      'coveringAnimal', // Animal-specific covering options
      'eyes',
      'facialStructure',
    ],
    speciesField: 'species',
    breedField: 'race_breed',
  },

  Reptile: {
    label: 'Reptile',
    fields: [
      'type',
      'species',
      'gender',
      'race_breed',
      'ageReptile', // Select with reptile life stages
      'height',
      'weight',
      'coveringReptile', // Reptile-specific covering options
      'eyes',
      'facialStructure',
    ],
    speciesField: 'species',
    breedField: 'race_breed',
  },

  Amphibian: {
    label: 'Amphibian',
    fields: [
      'type',
      'species',
      'gender',
      'race_breed',
      'ageAmphibian', // Select with amphibian life stages
      'height',
      'weight',
      'coveringAmphibian', // Amphibian-specific covering options
      'eyes',
      'facialStructure',
    ],
    speciesField: 'species',
    breedField: 'race_breed',
  },

  Fish: {
    label: 'Fish',
    fields: [
      'type',
      'species',
      'gender',
      'race_breed',
      'ageFish', // Select with fish life stages
      'height',
      'weight',
      'eyes',
    ],
    speciesField: 'species',
    breedField: 'race_breed',
  },

  Robot: {
    label: 'Robot',
    fields: [
      'type',
      'modelSeries', // Uses species field with model series options
      'gender',
      'race_breed',
      'ageRobot', // Select with robot operational stages
      'height',
      'weight',
    ],
    speciesField: 'modelSeries',
    breedField: 'race_breed',
  },

  Alien: {
    label: 'Alien',
    fields: [
      'type',
      'species',
      'gender',
      'race_breed',
      'ageAlien', // Select with alien life stages
      'height',
      'weight',
      'skinColor',
      'eyes',
      'facialStructure',
    ],
    speciesField: 'species',
    breedField: 'race_breed',
  },

  Plant: {
    label: 'Plant',
    fields: ['type', 'species', 'race_breed', 'agePlant', 'height', 'weight'],
    speciesField: 'species',
    breedField: 'race_breed',
  },

  Insect: {
    label: 'Insect',
    fields: [
      'type',
      'species',
      'gender',
      'race_breed',
      'ageInsect', // Select with insect life stages
      'height',
      'weight',
      'skinColor', // Insect color options
      'eyes',
      'bodyBuildInsect', // Insect-specific body build options
      'facialStructureInsect', // Insect-specific facial structure options
    ],
    speciesField: 'species',
    breedField: 'race_breed',
  },

  'Mythical Creature': {
    label: 'Mythical Creature',
    fields: [
      'type',
      'species',
      'gender',
      'race_breed',
      'ageMythical', // Select with mythical creature life stages
      'height',
      'weight',
      'coveringMythical', // Dynamic covering based on species
      'eyes',
      'facialStructure',
    ],
    speciesField: 'species',
    breedField: 'race_breed',
  },

  Unknown: {
    label: 'Unknown',
    fields: [
      'type',
      'speciesAll', // Special field that shows all species from all types
      'gender',
      'race_breed',
      'ageAnimal', // Use same age options as Animal
      'height',
      'weight',
      'coveringAnimal', // Use same covering options as Animal
      'eyes',
      'facialStructure',
    ],
    speciesField: 'speciesAll', // Use the special all-species field
    breedField: 'race_breed',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get character fields for a specific type
 */
const getCharacterFieldsByType = characterType => {
  const config = characterTypeConfigs[characterType];
  if (!config) return [];

  return config.fields
    .map(fieldId => {
      const fieldDef = fieldDefinitions[fieldId];
      if (!fieldDef) return null;

      // Create a copy of the field definition
      const field = { ...fieldDef };

      // Set default value for type field
      if (fieldId === 'type') {
        field.defaultValue = characterType;
      }

      // Populate species options based on type
      if (
        (fieldId === 'species' || fieldId === 'modelSeries') &&
        config.speciesField
      ) {
        field.options = getSpeciesOptionsByType(characterType);
      }

      // Populate breed options for dynamic breed fields
      if (
        fieldId === 'race_breed' &&
        field.dynamicOptions &&
        config.breedField
      ) {
        // This will be populated dynamically based on selected species
        field.options = [];
      }

      return field;
    })
    .filter(Boolean);
};

/**
 * Get species options for a character type
 */
const getSpeciesOptionsByType = characterType => {
  return Object.keys(speciesToTypeMapping).filter(
    species => speciesToTypeMapping[species] === characterType
  );
};

/**
 * Get breed options for a species
 */
const getBreedOptionsBySpecies = species => {
  return speciesToBreedMapping[species] || [];
};

/**
 * Get covering options for a species
 */
const getCoveringOptionsBySpecies = species => {
  return speciesToCoveringMapping[species] || [];
};

/**
 * Get character type from species
 */
const getCharacterTypeFromSpecies = species => {
  return speciesToTypeMapping[species] || null;
};

/**
 * Get all character type options
 */
const getCharacterTypeOptions = () => {
  return Object.keys(characterTypeConfigs).map(key => ({
    value: key,
    label: characterTypeConfigs[key].label,
  }));
};

/**
 * Get default character type
 */
const getDefaultCharacterType = () => {
  return 'Human';
};

// ============================================================================
// LEGACY COMPATIBILITY EXPORTS
// ============================================================================

// For backward compatibility with existing code
const characterData = {
  types: Object.keys(characterTypeConfigs).reduce((acc, type) => {
    acc[type] = {
      label: characterTypeConfigs[type].label,
      fields: getCharacterFieldsByType(type),
    };
    return acc;
  }, {}),
};

const characterFields = getCharacterFieldsByType('Human');
const characterFieldsAnimal = getCharacterFieldsByType('Animal');
const characterFieldsHuman = getCharacterFieldsByType('Human');
const breedOptionsBySpecies = speciesToBreedMapping;
const characterTypeConfig = characterTypeConfigs;

// Export all functions and data
module.exports = {
  // Helper functions
  getCharacterFieldsByType,
  getSpeciesOptionsByType,
  getBreedOptionsBySpecies,
  getCoveringOptionsBySpecies,
  getCharacterTypeFromSpecies,
  getCharacterTypeOptions,
  getDefaultCharacterType,

  // Data structures
  fieldDefinitions,
  speciesToTypeMapping,
  speciesToBreedMapping,
  speciesToCoveringMapping,
  characterTypeConfigs,

  // Legacy compatibility
  characterData,
  characterFields,
  characterFieldsAnimal,
  characterFieldsHuman,
  breedOptionsBySpecies,
  characterTypeConfig,
};
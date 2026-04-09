// questions.js — Question/answer data for the Bubble Quiz app
// Separate file for easy editing by non-developers

window.QUESTIONS = [
    {
        id: 'speed',
        bubbleText: 'How fast can a bubble collapse?',
        answerType: 'bar-chart',
        answer: {
            title: 'Speed Showdown',
            bars: [
                { label: 'Human',      value: 45,    display: '45 km/h',    icon: '\u{1F3C3}', color: '#2a9d8f' },
                { label: 'Cheetah',     value: 120,   display: '120 km/h',   icon: '\u{1F406}', color: '#4aba8a' },
                { label: 'Fighter Jet', value: 2200,  display: '2,200 km/h', icon: '\u{2708}\u{FE0F}', color: '#e9c46a' },
                { label: 'Bubble',      value: 5000,  display: '5,000 km/h', icon: '\u{1FAE7}', color: '#e63946' },
            ],
            funFact: 'A collapsing bubble can reach the speed of sound in water — over 5,000 km/h!',
            learnMore: [
                { label: 'Bubble collapse in slow motion', url: 'https://doi.org/10.1103/APS.DFD.2018.GFM.V0090', type: 'video' }
            ]
        }
    },
    {
        id: 'temperature',
        bubbleText: 'How hot is a collapsing bubble?',
        answerType: 'big-reveal',
        answer: {
            label: 'A collapsing bubble can reach...',
            number: '4,700',
            unit: '\u{00B0}C',
            badges: [
                { icon: '\u{1F9D1}', value: '37\u{00B0}C', label: 'Body' },
                { icon: '\u{1F373}', value: '250\u{00B0}C', label: 'Oven' },
                { icon: '\u{1F30B}', value: '1,200\u{00B0}C', label: 'Lava' },
                { icon: '\u{1FAE7}', value: '4,700\u{00B0}C', label: 'Bubble!', highlight: true },
                { icon: '\u{2600}\u{FE0F}', value: '5,500\u{00B0}C', label: 'Sun' },
            ],
            comparison: 'The balloon in our demo collapses the same way, but real cavitation bubbles get almost as hot as the Sun!',
            learnMore: [
                { label: 'Watch a bubble glow', url: 'http://acoustics-research.physics.ucla.edu/wp-content/uploads/2015/02/bubble.mp4', type: 'video' },
                { label: 'How bubbles make light', url: 'https://acoustics-research.physics.ucla.edu/sonoluminescence/', type: 'article' }
            ]
        }
    },
    {
        id: 'destruction',
        bubbleText: 'Can bubbles destroy metal?',
        answerType: 'icon-grid',
        answer: {
            title: 'Tiny Bubbles, Big Damage',
            items: [
                { icon: '\u{1F6A2}', label: 'Eats through ship propellers' },
                { icon: '\u{1F4A8}', label: 'Tiny jets faster than a racing car' },
                { icon: '\u{1F4B0}', label: 'Billions in repairs every year' },
                { icon: '\u{1F388}', label: 'Same physics as our balloon demo, but tiny and by the millions!' },
            ],
            learnMore: [
                { label: 'Can orange juice pop a balloon?', url: 'https://www.youtube.com/watch?v=M3K6aESmgxg', type: 'video' }
            ]
        }
    },
    {
        id: 'useful',
        bubbleText: 'Can cavitation be useful?',
        answerType: 'icon-grid',
        answer: {
            title: 'Cavitation for Good!',
            items: [
                { icon: '\u{1F9B7}', label: 'Cleans your teeth' },
                { icon: '\u{1F48A}', label: 'Mixes medicines' },
                { icon: '\u{1F4A7}', label: 'Purifies water' },
                { icon: '\u{2699}\u{FE0F}', label: 'Better propellers' },
            ],
            learnMore: [
                { label: 'Water purification', url: 'https://youtu.be/RcqCgge_Fxs', type: 'video' },
                { label: 'Sonochemistry', url: 'https://en.wikipedia.org/wiki/Sonochemistry', type: 'article' }
            ]
        }
    },
    {
        id: 'where',
        bubbleText: 'Where does cavitation happen?',
        answerType: 'icon-grid',
        answer: {
            title: 'Cavitation Is Everywhere!',
            items: [
                { icon: '\u{1F6A2}', label: 'Ship propellers' },
                { icon: '\u{1F990}', label: 'Pistol shrimp claws' },
                { icon: '\u{1F44A}', label: 'Even cracking your knuckles!' },
                { icon: '\u{1F3E0}', label: 'Your kitchen blender!' },
            ],
            learnMore: [
                { label: 'See a propeller shred water', url: 'https://www.youtube.com/watch?v=IKwQX31Mans', type: 'video' }
            ]
        }
    },
    {
        id: 'shrimp',
        bubbleText: 'Which animal uses bubbles as a weapon?',
        answerType: 'big-reveal',
        answer: {
            label: 'The secret weapon belongs to the...',
            number: 'Pistol Shrimp',
            unit: '',
            badges: [
                { icon: '\u{1F4CF}', value: '5 cm', label: 'long' },
                { icon: '\u{1F525}', value: '4,700\u{00B0}C', label: 'hot' },
                { icon: '\u{1F50A}', value: '218 dB', label: 'louder than a jet engine!' },
            ],
            comparison: 'Snaps its claw so fast it creates a cavitation bubble, a shock wave, and a flash of light!',
            learnMore: [
                { label: 'Pistol shrimp in slow motion', url: 'https://youtube.com/shorts/xm4-XGH95fs', type: 'video' },
                { label: 'The full story', url: 'https://youtu.be/eXR--I99S60', type: 'video' }
            ]
        }
    },
    // =========================================================================
    // Wave 2 — appears after all wave-1 bubbles have been answered
    // =========================================================================
    {
        id: 'space',
        wave: 2,
        bubbleText: 'What happens to bubbles in space?',
        answerType: 'big-reveal',
        answer: {
            label: 'In the vacuum of space, water does something wild...',
            number: 'It boils AND freezes!',
            unit: '',
            badges: [
                { icon: '\u{1F30C}', value: 'Near zero', label: 'pressure' },
                { icon: '\u{1F321}\u{FE0F}', value: 'Room temp', label: 'boiling point drops' },
                { icon: '\u{1FAE7}', value: 'Everywhere', label: 'bubbles!' },
            ],
            comparison: 'Without air pressure, water boils at room temperature \u{2014} the whole liquid fills with bubbles. Even liquids in spacesuits could start bubbling!',
            learnMore: [
                { label: 'Water goes wild in a vacuum', url: 'https://www.youtube.com/shorts/uHGE2i7Wd3s', type: 'video' }
            ]
        }
    },
    {
        id: 'ships',
        wave: 2,
        bubbleText: 'Can a bubble sink a ship?',
        answerType: 'icon-grid',
        answer: {
            title: 'Bubbles vs. Ships',
            items: [
                { icon: '\u{1F6A2}', label: 'Propeller bubbles eat through metal over time' },
                { icon: '\u{1F93F}', label: 'Noisy bubbles reveal hidden submarines' },
                { icon: '\u{2693}', label: 'Seabed gas bubbles can make ships lose buoyancy' },
                { icon: '\u{1F527}', label: 'Navies spend millions fighting cavitation damage' },
            ],
            learnMore: [
                { label: 'Cavitation explained', url: 'https://en.wikipedia.org/wiki/Cavitation', type: 'article' }
            ]
        }
    },
    {
        id: 'doctors',
        wave: 2,
        bubbleText: 'How do doctors use bubbles?',
        answerType: 'icon-grid',
        answer: {
            title: 'Bubbles in Medicine',
            items: [
                { icon: '\u{1FAB7}', label: 'Smash kidney stones without surgery' },
                { icon: '\u{1F489}', label: 'Deliver medicine to exact spots in the body' },
                { icon: '\u{1F50D}', label: 'Tiny bubbles help ultrasound scans see inside you' },
                { icon: '\u{1F9A0}', label: 'Kill bacteria on surgical tools' },
            ],
            learnMore: [
                { label: 'How kidney stone treatment works', url: 'https://en.wikipedia.org/wiki/Lithotripsy', type: 'article' }
            ]
        }
    },
    {
        id: 'size',
        wave: 2,
        bubbleText: 'How small is a cavitation bubble?',
        answerType: 'bar-chart',
        answer: {
            title: 'Incredibly Tiny!',
            bars: [
                { label: 'Grain of sand', value: 500,  display: '0.5 mm',   icon: '\u{1F3D6}\u{FE0F}', color: '#e9c46a' },
                { label: 'Bubble',        value: 100,  display: '~0.1 mm',  icon: '\u{1FAE7}', color: '#e63946' },
                { label: 'Human hair',    value: 70,   display: '0.07 mm',  icon: '\u{1F9D1}', color: '#4aba8a' },
                { label: 'Red blood cell', value: 7,   display: '0.007 mm', icon: '\u{1FA78}', color: '#c03030' },
            ],
            funFact: 'Most cavitation bubbles are smaller than a grain of sand \u{2014} yet they can destroy solid steel!',
            learnMore: [
                { label: '82,000fps \u{2014} blink and miss it', url: 'https://youtube.com/shorts/xM6zdim0yk4', type: 'video' }
            ]
        }
    },
    {
        id: 'torpedo',
        wave: 2,
        bubbleText: 'Can bubbles make you go faster?',
        answerType: 'bar-chart',
        answer: {
            title: 'Supercavitation Speed!',
            bars: [
                { label: 'Normal torpedo', value: 80,  display: '80 km/h',  icon: '\u{1F4A3}', color: '#2a9d8f' },
                { label: 'Speedboat',      value: 130, display: '130 km/h', icon: '\u{1F6E5}\u{FE0F}', color: '#4aba8a' },
                { label: 'Super torpedo',  value: 370, display: '370 km/h', icon: '\u{1F680}', color: '#e63946' },
            ],
            funFact: 'Some torpedoes wrap themselves in a giant air bubble to travel almost 5 times faster underwater!',
            learnMore: [
                { label: 'How supercavitation works', url: 'https://en.wikipedia.org/wiki/Supercavitation', type: 'article' }
            ]
        }
    },
    {
        id: 'knuckles',
        wave: 2,
        bubbleText: 'What happens when you crack your knuckles?',
        answerType: 'big-reveal',
        answer: {
            label: 'That satisfying pop is actually...',
            number: 'Cavitation!',
            unit: '',
            badges: [
                { icon: '\u{1F9B4}', value: 'Synovial fluid', label: 'between joints' },
                { icon: '\u{1FAE7}', value: 'Gas bubble', label: 'forms & pops' },
                { icon: '\u{23F1}\u{FE0F}', value: '20 min', label: 'recharge time' },
            ],
            comparison: 'When you pull your finger, the pressure drops in the fluid between your joints \u{2014} same physics as a propeller, but inside your own body!',
            learnMore: [
                { label: 'Your knuckles under MRI', url: 'https://www.youtube.com/watch?v=n3IYmdy6d4Y', type: 'video' }
            ]
        }
    }
];

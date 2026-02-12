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
            funFact: 'A collapsing cavitation bubble moves close to the speed of sound in water (5,400 km/h)!'
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
            comparison: ''
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
                { icon: '\u{1F4A8}', label: 'Micro-jets at 100 m/s' },
                { icon: '\u{1F4B0}', label: 'Billions in repairs every year' },
                { icon: '\u{1F388}', label: 'Like our balloon demo, but millions of times!' },
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
                { icon: '\u{1F6B0}', label: 'Pumps and pipes' },
                { icon: '\u{1F3E0}', label: 'Your kitchen blender!' },
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
                { icon: '\u{1F50A}', value: '218 dB', label: 'loud' },
            ],
            comparison: 'Snaps its claw so fast it creates a cavitation bubble, a shock wave, and a flash of light!'
        }
    }
];

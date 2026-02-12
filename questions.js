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
            comparison: 'That\u{2019}s nearly as hot as the surface of the Sun (5,500\u{00B0}C)! The bubble collapses so fast that the trapped gas is squeezed and heated to extreme temperatures in a fraction of a millisecond.'
        }
    },
    {
        id: 'destruction',
        bubbleText: 'Can bubbles destroy metal?',
        answerType: 'text-fact',
        answer: {
            title: 'Tiny Bubbles, Big Damage',
            facts: [
                { icon: '\u{1F6A2}', text: 'Ship propellers get eaten away by millions of tiny bubble collapses. This is called cavitation erosion.' },
                { icon: '\u{26A0}\u{FE0F}', text: 'Each collapsing bubble fires a tiny jet of water at the metal surface at over 100 m/s.' },
                { icon: '\u{1F4B0}', text: 'Cavitation damage costs billions of pounds every year to repair in ships, pumps, and turbines.' },
                { icon: '\u{1F52C}', text: 'In our demo, you can see how the shock wave from a collapsing bubble bursts a balloon. Imagine millions of those hitting a propeller!' }
            ]
        }
    },
    {
        id: 'useful',
        bubbleText: 'Can cavitation be useful?',
        answerType: 'text-fact',
        answer: {
            title: 'Cavitation for Good!',
            facts: [
                { icon: '\u{1F9B7}', text: 'Your dentist uses ultrasonic cavitation to clean your teeth. Tiny bubbles collapse and blast away plaque.' },
                { icon: '\u{1F48A}', text: 'Scientists use cavitation to mix medicines and break apart cells for research.' },
                { icon: '\u{1F52C}', text: 'Cavitation is used to purify water by destroying bacteria with shock waves.' },
                { icon: '\u{1F680}', text: 'Engineers study cavitation to design better, quieter, and more efficient propellers and pumps.' }
            ]
        }
    },
    {
        id: 'where',
        bubbleText: 'Where does cavitation happen?',
        answerType: 'text-fact',
        answer: {
            title: 'Cavitation Is Everywhere!',
            facts: [
                { icon: '\u{1F6A2}', text: 'On every ship propeller spinning in the ocean. Fast-moving blades create low-pressure zones where bubbles form and collapse.' },
                { icon: '\u{1F990}', text: 'The pistol shrimp snaps its claw so fast it creates a cavitation bubble. The collapsing bubble stuns its prey!' },
                { icon: '\u{1F6B0}', text: 'Inside pumps and pipes wherever water flows fast and pressure drops quickly.' },
                { icon: '\u{1F3E0}', text: 'Even in your kitchen! A blender creates cavitation bubbles to mix your smoothie.' }
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
            comparison: 'This tiny shrimp (only 5 cm long) snaps its claw shut so fast that it creates a cavitation bubble. When the bubble collapses, it produces a shock wave, a flash of light, and temperatures of over 4,700\u{00B0}C! The snap is one of the loudest sounds in the ocean.'
        }
    }
];

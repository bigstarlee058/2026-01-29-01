import { useEffect, useRef, useState } from 'react';
import styles from './ToneStoryCreation.module.scss';

const ToneStoryCreation = ({ title }) => {
  const [selectedOptions, setSelectedOptions] = useState({});
  const [hoveredOption, setHoveredOption] = useState(null);
  const [closeTimeout, setCloseTimeout] = useState(null);
  const optionRefs = useRef({});

  const toneOptions = [
    {
      id: 1,
      name: 'Purpose',
      options: [
        'Inspire',
        'Educate',
        'Promote',
        'Entertain',
        'Launch Something',
        'Tell a Story',
        'Raise Awareness',
        'Get Signups',
        'Explain an Idea',
        'Share a Feeling',
        'Change a Mindset',
        'Celebrate a Moment',
        'Invite Collaboration',
      ],
    },
    {
      id: 2,
      name: 'Tone',
      options: [
        'Cinematic',
        'Bold',
        'Friendly',
        'Emotional',
        'Funny',
        'Witty',
        'Honest / Raw',
        'Mysterious',
        'Uplifting',
        'Calm',
        'Thoughtful',
        'Playful',
        'Poetic',
        'Corporate / Professional (for B2B use cases)',
      ],
    },
    {
      id: 3,
      name: 'Perspective',
      options: [
        'Me (First-Person)',
        'From the Viewer (Second-Person)',
        'Narrator / Voice-Over',
        'From a Character',
        'Shared / Collective ("We")',
        'Anonymous / Impersonal',
        'Testimonial / Interview Style',
      ],
    },
    {
      id: 4,
      name: 'Pace',
      options: [
        'Fast & Dynamic',
        'Punchy & Bold',
        'Steady & Story-Driven',
        'Calm & Reflective',
        'Dreamlike / Fluid',
        'Tension-Building',
        'Rhythmic / Poetic',
        'Auto (Let AI decide)',
      ],
    },
    {
      id: 5,
      name: 'Audience',
      options: [
        'Solo Creators',
        'YouTubers',
        'TikTokers',
        'Designers',
        'Animators',
        'Podcasters',
        'Indie Artists',
        'Freelancers',
        'Startup Founders',
        'Marketing Teams',
        'Creative Agencies',
        'Product Teams',
        'Enterprise Clients',
        'Kids',
        'Parents',
        'Students',
        'Teachers',
        'Dreamers',
        'First-Time Creators',
        'Skeptics',
        'Teams / Communities',
        'Early Adopters',
        'Global Audience',
      ],
    },
    {
      id: 6,
      name: 'Duration',
      options: [
        '15 seconds',
        '30 seconds',
        '45 seconds',
        '60 seconds',
        '90 seconds',
        '2 minutes',
        '3–5 minutes',
        'Custom',
        'Auto (AI decides)',
      ],
    },
    {
      id: 7,
      name: 'Format',
      options: [
        'YouTube',
        'TikTok',
        'Instagram Reel',
        'LinkedIn',
        'Twitter / X',
        'Web Ad',
        'Explainer',
        'Product Launch',
        'Demo Video',
        'Personal Story',
        'Investor Pitch',
        'Voice-Only',
        'Text-on-Screen Only',
        'Multi-Platform',
        'Internal Use',
      ],
    },
  ];

  // Initialize default selections (first option for each category) - only once
  useEffect(() => {
    const defaultSelections = {};
    toneOptions.forEach(option => {
      if (option.options && option.options.length > 0) {
        defaultSelections[option.id] = option.options[0];
      }
    });
    setSelectedOptions(defaultSelections);
  }, []); // Empty dependency array - only run once on mount

  const handleMouseEnter = option => {
    // Clear any existing timeout
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      setCloseTimeout(null);
    }
    setHoveredOption(option);
  };

  const handleMouseLeave = () => {
    // Add a small delay to allow moving to dropdown
    const timeout = setTimeout(() => {
      setHoveredOption(null);
    }, 150);
    setCloseTimeout(timeout);
  };

  const handleDropdownMouseEnter = () => {
    // Clear the timeout when entering dropdown
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      setCloseTimeout(null);
    }
  };

  const handleDropdownMouseLeave = () => {
    setHoveredOption(null);
  };

  const handleSelectionChange = newSelections => {
    setSelectedOptions(newSelections);
  };

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>{title}</h1>

      <div className={styles.toneCategoriesSection}>
        <div className={styles.options}>
          {toneOptions.map(option => (
            <div
              key={option.id}
              ref={el => (optionRefs.current[option.id] = el)}
              className={`${styles.optionContainer} ${
                selectedOptions[option.id] ? styles.hasSelection : ''
              }`}
              onMouseEnter={() => handleMouseEnter(option)}
              onMouseLeave={handleMouseLeave}
            >
              <div className={styles.option}>
                {selectedOptions[option.id] || option.name}
                {/* Debug: {JSON.stringify(selectedOptions[option.id])} */}
              </div>

              {/* Simple Dropdown */}
              {hoveredOption?.id === option.id && (
                <div
                  className={styles.dropdown}
                  onMouseEnter={handleDropdownMouseEnter}
                  onMouseLeave={handleDropdownMouseLeave}
                >
                  <div className={styles.dropdownOptions}>
                    {option.options.map((dropdownOption, index) => (
                      <div
                        key={index}
                        className={`${styles.dropdownOption} ${
                          selectedOptions[option.id] === dropdownOption
                            ? styles.selected
                            : ''
                        }`}
                        onClick={() => {
                          setSelectedOptions(prev => ({
                            ...prev,
                            [option.id]: dropdownOption,
                          }));
                          setHoveredOption(null);
                        }}
                      >
                        {dropdownOption}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export { ToneStoryCreation };


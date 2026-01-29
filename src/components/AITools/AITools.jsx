import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { user } from '../../redux/auth';
import { useAddStoryMutation } from '../../redux/stories/storyApi';
import { sizes } from 'data/sizes';
import styles from './AITools.module.scss';
import { EffectIcon } from 'components/Icons';
import * as Icons from 'components/Icons';

const toolsList = [
  {
    id: 1,
    name: 'MYSCRIPT',
    title: 'Start with my script',
    description: 'Create a video with AI generated images based on your script',
    icon: 'MyScriptIcon',
    color: '#D3F85A',
    path: '/createProject/create',
  },
  {
    id: 4,
    name: 'MYCONTENT',
    title: 'Start from Scratch',
    description: 'Build a video using your own\ncontent — fully blank project',
    icon: 'MyContentIcon',
    color: '#FE78FE',
    isBlank: true,
  },
  {
    id: 3,
    name: 'GENERATESCRIPT',
    title: 'Generate script',
    description:
      'Generate a video with AI-created images and an AI-written script',
    icon: 'GeneratedScriptIcon',
    color: '#3AFCEA',
    comingSoon: true,
    disabled: true,
    path: '/generateScript', // needs to be changed when the page is created
  },
];

const IconMap = Object.fromEntries(
  Object.keys(Icons).map(key => [key, Icons[key]])
);

const AITools = ({
  handleToolClick,
  hasBorder = false,
  toolsWidth = '392px',
}) => {
  const [activeTool, setActiveTool] = useState(null);
  const navigate = useNavigate();
  const { username } = useSelector(user);
  const [addStory] = useAddStoryMutation();

  const handleClick = tool => {
    setActiveTool(tool.name);
    handleToolClick(tool.name);

    if (!tool.disabled) {
      if (tool.isBlank) {
        // For blank projects, handle creation logic here
        handleBlankProjectCreation();
      } else if (tool.path) {
        navigate(tool.path);
      }
    }
  };

  const handleBlankProjectCreation = async () => {
    // Create blank project and redirect to VideoCreationPage
    try {
      const defaultSize = sizes.sizes[0]; // Default size
      const defaultStyle = sizes.presets[1]; // Default style

      const defaultMaxTime = 60000; // 60 seconds default

      const newStory = await addStory({
        name: 'My Story',
        text: '',
        isDraft: false,
        author: username,
        width: defaultSize.size.width,
        height: defaultSize.size.height,
        orientation: defaultSize.name,
        generationStyle: {
          preset: defaultStyle?.name,
          style: defaultStyle?.style,
        },
        resolution: defaultSize.generationSize,
        skipVoiceover: true,
        maxTime: defaultMaxTime,
        characters: [],
        isBlank: true,
      }).unwrap();

      // Redirect to VideoCreationPage with blank flag
      navigate(`/createVideo/${newStory._id}?blank=true`);
    } catch (error) {
      console.error('Error creating blank project:', error);
      // Fallback to regular creation page
      navigate('/createProject/create');
    }
  };

  return (
    <div className={styles.container}>
      {toolsList.map(tool => {
        const IconComponent = IconMap[tool.icon];
        return (
          <div
            key={tool.id}
            className={`${styles.tool} ${
              activeTool === tool.name ? styles.active : ''
            } ${tool.disabled ? styles.disabled : ''} ${
              hasBorder ? styles.bordered : ''
            }`}
            style={{ width: toolsWidth }}
            onClick={() => !tool.disabled && handleClick(tool)}
          >
            {/* <img src={tool.icon} alt={tool.name} className={styles.icon} /> */}
            <div className={styles.icon}>
              <EffectIcon color={tool.color} />
              <div className={styles.iconContent}>
                <IconComponent color={tool.color} />
              </div>
            </div>
            <div className={styles.toolContent}>
              <h3 className={styles.title}>{tool.title}</h3>
              <p className={styles.description}>{tool.description}</p>
            </div>
            {tool.comingSoon && (
              <p className={styles.comingSoon}>coming soon</p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export { AITools };

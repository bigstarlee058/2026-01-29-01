import { StepLineIcon } from 'components/Icons';
import styles from './index.module.scss';

// const steps = [
//   { step: 1, title: 'Foundations', component: 'VideoFormatSection' },
//   { step: 2, title: 'My story', component: 'DescribeStorySection' },
//   { step: 3, title: 'Storyboard', component: 'TextStyleSection' },
//   { step: 4, title: 'Sound', component: 'NarratedVideoSection' },
//   { step: 5, title: 'Video making', component: 'VideoMakingSection' },
// ];

const steps = [
  { step: 1, title: 'My story', component: 'DescribeStorySection' },
  { step: 2, title: 'Storyboard', component: 'Storyboard' },
  { step: 3, title: 'Video making', component: 'VideoMakingSection' },
];
function Stepper({ stage, onStepperClick }) {
  const getClassName = step => {
    if (stage === step) {
      return styles.activeStep;
    } else if (stage >= step) {
      return styles.passedStep;
    } else return styles.step;
  };

  const onStepClick = step => {
    onStepperClick(step);
  };

  return (
    <ul className={styles.container}>
      {steps.map(i => (
        <div className={styles.step_box} key={i.step}>
          <li onClick={() => onStepClick(i.step)}>
            <h1 className={stage >= i.step ? styles.activeTitle : styles.title}>
              {i.title}
            </h1>
            <div className={getClassName(i.step)}>{i.step}</div>
          </li>
          {i.step <= 2 && <StepLineIcon />}
        </div>
      ))}
    </ul>
  );
}

export { Stepper };

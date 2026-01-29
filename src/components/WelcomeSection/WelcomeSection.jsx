import React from 'react';
import welcomeLogo from 'images/welkomLogo.svg';
import welcomStars from 'images/welcomeStars.svg';
import styles from './WelcomeSection.module.scss';
import PropTypes from 'prop-types';

function WelcomeSection({ name }) {
  return (
    <div className={styles.container}>
      <img
        className={styles.welcome_logo}
        src={welcomeLogo}
        alt="welcome designed logo"
      />
      <div className={styles.text_area}>
        <h1 className={styles.greeting}>Welcome{name? `,  ${name}!`: '!'}</h1>
        <p className={styles.greeting_name}>
          Have a productive day
          <span>
            <img
              className={styles.welcome_stars}
              src={welcomStars}
              alt="greeting stars"
            />
          </span>
        </p>
      </div>
    </div>
  );
}

WelcomeSection.propTypes = {
  name: PropTypes.string,
};
export { WelcomeSection };

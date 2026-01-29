import React from 'react';
import styles from './Success.module.scss';
import { Button } from 'components/reusableComponents/Button';

function Success({ onSubmit }) {

  return (
    <div className={styles.container}>
      <div className={styles.content_text}>
        <h1>Password changed</h1>
        <p className={styles.paragraf}>
          Your password has been changed successfully!
        </p>
        <div className={styles.button_container}>
          <Button
            text="Log in"
            handleClick={onSubmit}
          />
        </div>
      </div>
    </div>
  );
}

export { Success };

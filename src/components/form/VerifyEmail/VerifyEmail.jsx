import React, { useState, useEffect } from 'react';
import styles from './VerifyEmail.module.scss';
import { useNavigate } from 'react-router-dom';
import { Button } from 'components/reusableComponents/Button';

function VerifyEmail({ onSubmit, userEmail = '' }) {
  const navigate = useNavigate();
  const [displayEmail, setDisplayEmail] = useState(userEmail);
  
  // Перевіряємо, чи є email в userEmail props або в localStorage
  useEffect(() => {
    if (userEmail) {
      setDisplayEmail(userEmail);
    } else {
      const savedEmail = localStorage.getItem('userEmail');
      if (savedEmail) {
setDisplayEmail(savedEmail);
      }
    }
  }, [userEmail]);
  
  const handleContinue = () => {
onSubmit({ email: displayEmail });
  };
    
  return (
    <div className={styles.container}>
      <div className={styles.content_text}>
        <h1>Reset password</h1>
        <p className={styles.paragraf}>
          Click &quot;Continue&quot; to reset your password for {displayEmail}
        </p>
        <div className={styles.button_container}>
          <Button text="Continue" handleClick={handleContinue} />
        </div>
      </div>
      <div className={styles.bottom_container}>
        <p className={styles.logIn} onClick={() => navigate('/login')}>
          Back to log In
        </p>
      </div>
    </div>
  );
}
export { VerifyEmail };

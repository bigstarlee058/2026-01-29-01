import React from 'react';
import styles from './NewPassword.module.scss';
import { InputForm } from 'components/reusableComponents/InputForm';

const inputList = [
  { label: 'Password', name: 'password' },
  { label: 'Repeat password', name: 'repeat_password' },
];

function NewPassword({ onSubmit }) {
  return (
    <div className={styles.container}>
      <div className={styles.content_text}>
        <h1>Set new password</h1>
      </div>
      <InputForm
        inputList={inputList}
        onDataChange={onSubmit}
        btnText="Continue"
        hideLabels={true}
        hideForgotPassword={true}
        hideSignUpLink={true}
        formProps={{ 'data-form-type': 'reset-password' }}
      />
    </div>
  );
}
export { NewPassword };

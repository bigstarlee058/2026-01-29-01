import styles from './index.module.scss';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { joiResolver } from '@hookform/resolvers/joi';
import { Button } from 'components/reusableComponents/Button';
import Joi from 'joi';
import Eye from 'components/Icons/Eye';
import EyeOff from 'components/Icons/EyeOff';
import { useNavigate } from 'react-router-dom';

function InputForm({
  inputList,
  onDataChange,
  btnText,
  isRejected,
  errorMessage = {},
  hideLabels = false,
  initialValues = {},
  hideForgotPassword = false,
  hideSignUpLink = false,
  linkInfo = { text: "Don't have an account yet?", linkText: "Sign Up", path: "/signUp" },
  formProps = {},
  onInputChange,
}) {
  const [wasSubmitAttempted, setWasSubmitAttempted] = useState(false);
  
  const schema = Joi.object(
    inputList.reduce((acc, { name }) => {
      if (name === 'username') {
        acc[name] = Joi.string()
          .alphanum()
          .min(3)
          .max(30)
          .required()
          .messages({ 'string.empty': 'This field cannot be empty!' });
      } else if (name === 'email') {
        acc[name] = Joi.string()
          .email({
            minDomainSegments: 2,
            tlds: { allow: ['com', 'net', 'io', 'ca'] },
          })
          .required()
          .messages({ 
            'string.empty': 'This field cannot be empty!',
            'string.email': "We couldn't find an account with that email."
          });
      } else if (name === 'password') {
        acc[name] = Joi.string()
          .min(8)
          // .pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()]).{8,}$/)
          .pattern(/^(?=.*[a-z])(?=.*\d).{8,}$/)
          .required()
          .messages({
            'string.empty': 'This field cannot be empty!',
            'string.min': 'Incorrect password. Please try again.',
            'string.pattern.base': 'Incorrect password. Please try again.'
          });
      } else if (name === 'repeat_password') {
        acc[name] = Joi.any().valid(Joi.ref('password')).required().messages({
          'any.only': 'The passwords do not match. Please try again.',
          'any.required': 'This field cannot be empty!',
        });
      }
      return acc;
    }, {})
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    clearErrors,
  } = useForm({
    resolver: joiResolver(schema),
    defaultValues: initialValues,
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

  useEffect(() => {
    Object.keys(initialValues).forEach(key => {
      setValue(key, initialValues[key]);
    });
  }, [initialValues, setValue]);

  const [visibility, setVisibility] = useState({
    password: false,
    repeat_password: false,
  });
  
  const [iconColor, setIconColor] = useState('#FFFFFF4D');

  const handleToggle = inputName => {
    setVisibility(prevVisibility => ({
      ...prevVisibility,
      [inputName]: !prevVisibility[inputName],
    }));
  };

  const onSubmit = data => {
    onDataChange(data);
  };

  const handleChange = () => {
if (wasSubmitAttempted) {
      setWasSubmitAttempted(false);
    }
    
    if (onInputChange) {
      onInputChange();
    }
    
    clearErrors();
  };

  const navigate = useNavigate();

  return (
    <form className={styles.inputForm} onSubmit={(e) => {
      setWasSubmitAttempted(true);
      handleSubmit(onSubmit)(e);
    }} {...formProps}>
      <div className={styles.inputs_section}>
        <div className={styles.inputList_container}>
          <ul>
            {inputList &&
              inputList.map(({ label, name }, index) => {
                const shouldShowError = (wasSubmitAttempted && errors[name]) || 
                                       (isRejected && errorMessage?.name === name);
                
                return (
                  <li key={index} className={styles.item}>
                    {!hideLabels && <label htmlFor={name}>{label}</label>}
                    <div style={{ position: 'relative' }}>
                      <input
                        className={`
                          ${shouldShowError ? styles.input_empty : styles.input}
                          ${name === 'password' || name === 'repeat_password' ? styles.password_input : ''}
                        `}
                        id={name}
                        type={
                          name === 'password' || name === 'repeat_password'
                            ? visibility[name]
                              ? 'text'
                              : 'password'
                            : 'text'
                        }
                        autoComplete={
                          name === 'username' ? 'username' :
                          name === 'email' ? 'email' :
                          name === 'password' ? 
                            (formProps['data-form-type'] === 'signup' ? 'new-password' : 
                             formProps['data-form-type'] === 'reset-password' ? 'new-password' :
                             'current-password') :
                          name === 'repeat_password' ? 'new-password' : 'off'
                        }
                        placeholder=""
                        onChange={handleChange}
                        {...register(name)}
                      />
                      {hideLabels && (
                        <span 
                          className={`${styles.input_label} ${
                            shouldShowError ? styles.input_label_error : ""
                          }`}
                        >
                          {label}
                        </span>
                      )}
                      {(name === 'password' || name === 'repeat_password') && (
                        <span
                          className={styles.show_hide}
                          onClick={() => handleToggle(name)}
                          onMouseEnter={() => setIconColor('#f1f1f1')}
                          onMouseLeave={() => setIconColor('#FFFFFF4D')}
                        >
                          {visibility[name] ? (
                            <Eye stroke={iconColor} />
                          ) : (
                            <EyeOff stroke={iconColor} />
                          )}
                        </span>
                      )}
                    </div>
                    
                    <div className={styles.bottom_container}>
                      <div className={styles.error_container}>
                        {wasSubmitAttempted && errors[name] ? (
                          <p className={styles.errorMessage}>
                            {errors[name].message}
                          </p>
                        ) : (isRejected && errorMessage?.name === name) && (
                          <p className={styles.errorMessage}>{errorMessage.error}</p>
                        )}
                      </div>
                      
                      {name === 'password' && !hideForgotPassword && (
                        <div className={styles.forgot_container}>
                          <button type="button" className={styles.forgot} onClick={() => navigate('/reset')}>
                            Forgot password?
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
          </ul>
        </div>
      </div>

      <div className={styles.button_container}>
        <Button type="submit" text={btnText} />
        {!hideSignUpLink && (
          <div className={styles.signup_link}>
            <span>{linkInfo.text}</span>
            <a onClick={() => navigate(linkInfo.path)}>{linkInfo.linkText}</a>
          </div>
        )}
      </div>
    </form>
  );
}

export { InputForm };

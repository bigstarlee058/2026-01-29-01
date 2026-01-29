import styles from './index.module.scss';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { joiResolver } from '@hookform/resolvers/joi';
import { Button } from 'components/reusableComponents/Button';
import Joi from 'joi';
import { useNavigate } from 'react-router-dom';

function VerificationCodeForm({
  inputList,
  onDataChange,
  btnText,
  errorMessage = {},
  hideLabels = false,
  initialValues = {},
  hideSignUpLink = false,
  linkInfo = {
    text: "Don't have an account yet?",
    linkText: 'Sign Up',
    path: '/signUp',
  },
  formProps = {},
}) {
  const schema = Joi.object(
    inputList.reduce((acc, { name }) => {
      if (name === 'code') {
        acc[name] = Joi.string()
          .length(6)
          .pattern(/^\d{6}$/)
          .required()
          .messages({
            'string.empty': 'This field cannot be empty.',
            'string.length': 'The verification code must be 6 digits.',
            'string.pattern.base': 'The verification code must be numeric.',
          });
      }
      return acc;
    }, {})
  );

  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields, isSubmitting },
    setValue,
  } = useForm({
    resolver: joiResolver(schema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    Object.keys(initialValues).forEach(key => {
      setValue(key, initialValues[key]);
    });
  }, [initialValues, setValue]);

  const onSubmit = data => {
    onDataChange(data);
  };

  const navigate = useNavigate();

  return (
    <form
      className={styles.inputForm}
      onSubmit={handleSubmit(onSubmit)}
      {...formProps}
    >
      <div className={styles.inputs_section}>
        <div className={styles.inputList_container}>
          <ul>
            {inputList &&
              inputList.map(({ label, name }, index) => (
                <li key={index} className={styles.item}>
                  {!hideLabels && <label htmlFor={name}>{label}</label>}
                  <div style={{ position: 'relative' }}>
                    <input
                      className={`
                        ${
                          (errors[name] || (errorMessage && typeof errorMessage === 'string' && errorMessage.length > 0)) && touchedFields[name] && !isSubmitting
                            ? styles.input_empty
                            : styles.input
                        }
                        ${name === 'code' ? styles.verification_code_input : ''}
                      `}
                      id={name}
                      type="text"
                      placeholder=""
                      {...register(name)}
                    />
                    {hideLabels && (
                      <span
                        className={`${styles.input_label} ${
                          (errors[name] || (errorMessage && typeof errorMessage === 'string' && errorMessage.length > 0)) && touchedFields[name] && !isSubmitting
                            ? styles.input_label_error
                            : ''
                        }`}
                      >
                        {label}
                      </span>
                    )}
                  </div>

                  <div className={styles.bottom_container}>
                    <div className={styles.error_container}>
                      {errors[name] && !isSubmitting && (
                        <p className={styles.errorMessage}>
                          {errors[name].message}
                        </p>
                      )}
                      {errorMessage && typeof errorMessage === 'string' && !isSubmitting && (
                        <p className={styles.errorMessage}>{errorMessage}</p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
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

export { VerificationCodeForm };

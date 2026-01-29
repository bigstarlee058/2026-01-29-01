import { useSelector } from 'react-redux';
import { isLoggedIn } from '../../../redux/auth';
import { Navigate } from 'react-router-dom';

export const RestrictedRoute = ({ component: Component, redirectTo = '/' }) => {
  const isLogged = useSelector(isLoggedIn);

  return isLogged ? <Navigate to={redirectTo} /> : <Component />;
};

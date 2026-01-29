import { useSelector } from 'react-redux';
import { isLoggedIn, isRefresh } from '../../../redux/auth';
import { Navigate } from 'react-router-dom';

export const PrivateRoute = ({
  component: Component,
  redirectTo = '/login',
}) => {
  const isLogged = useSelector(isLoggedIn);
  const isRefreshing = useSelector(isRefresh);

  let shouldRedirect = isLogged && !isRefreshing;

  return shouldRedirect ? <Component /> : <Navigate to={redirectTo} />;
};

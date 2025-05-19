import { useParams, Navigate } from 'react-router-dom';

export default function VerifyRedirect() {
  const { token } = useParams();
  return <Navigate to={`/verify-email?token=${encodeURIComponent(token)}`} replace />;
} 
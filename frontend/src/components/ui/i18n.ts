export type Lang = "en" | "es";

export const landingCopy: Record<Lang, {
  tag: string;
  heading: string;
  lead: string;
  building: string;
  signIn: string;
  signedIn: string;
  signOut: string;
}> = {
  en: {
    tag: "NASA Space Apps 2026",
    heading: "Site under construction",
    lead: "We're adapting farms with NASA data. Check back soon.",
    building: "Building",
    signIn: "Sign in",
    signedIn: "Signed in",
    signOut: "Sign out",
  },
  es: {
    tag: "NASA Space Apps 2026",
    heading: "Sitio en construcción",
    lead: "Estamos adaptando la agricultura con datos de la NASA. Vuelve pronto.",
    building: "Construyendo",
    signIn: "Iniciar sesión",
    signedIn: "Sesión iniciada",
    signOut: "Cerrar sesión",
  },
};

export const authCopy: Record<Lang, {
  signInTitle: string;
  signInSub: string;
  toSignUp: string;
  signUpTitle: string;
  signUpSub: string;
  toSignIn: string;
  confirmTitle: string;
  confirmSub: (email: string) => string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  code: string;
  submitSignIn: string;
  submitSignUp: string;
  submitConfirm: string;
  showPassword: string;
  hidePassword: string;
  close: string;
  mismatch: string;
  working: string;
  tagline: string;
}> = {
  en: {
    signInTitle: "Welcome back",
    signInSub: "Don't have an account?",
    toSignUp: "Create one",
    signUpTitle: "Create your account",
    signUpSub: "Already have an account?",
    toSignIn: "Sign in",
    confirmTitle: "Check your email",
    confirmSub: (email) => `Enter the code we sent to ${email}.`,
    firstName: "First name",
    lastName: "Last name",
    email: "Email address",
    password: "Password",
    confirmPassword: "Confirm password",
    code: "Confirmation code",
    submitSignIn: "Sign in",
    submitSignUp: "Create account",
    submitConfirm: "Confirm",
    showPassword: "Show password",
    hidePassword: "Hide password",
    close: "Close",
    mismatch: "Passwords don't match.",
    working: "Please wait…",
    tagline: "The rain god of the harvest.",
  },
  es: {
    signInTitle: "Bienvenido de nuevo",
    signInSub: "¿No tienes cuenta?",
    toSignUp: "Crea una",
    signUpTitle: "Crea tu cuenta",
    signUpSub: "¿Ya tienes cuenta?",
    toSignIn: "Inicia sesión",
    confirmTitle: "Revisa tu correo",
    confirmSub: (email) => `Ingresa el código que enviamos a ${email}.`,
    firstName: "Nombre",
    lastName: "Apellido",
    email: "Correo electrónico",
    password: "Contraseña",
    confirmPassword: "Confirmar contraseña",
    code: "Código de confirmación",
    submitSignIn: "Iniciar sesión",
    submitSignUp: "Crear cuenta",
    submitConfirm: "Confirmar",
    showPassword: "Mostrar contraseña",
    hidePassword: "Ocultar contraseña",
    close: "Cerrar",
    mismatch: "Las contraseñas no coinciden.",
    working: "Espera…",
    tagline: "El dios de la lluvia y la cosecha.",
  },
};

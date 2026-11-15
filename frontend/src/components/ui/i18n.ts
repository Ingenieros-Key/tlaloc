export type Lang = "en" | "es";

export const landingCopy: Record<Lang, {
  tag: string;
  headline: string;
  description: string;
  workspace: string;
}> = {
  en: {
    tag: "NASA Space Apps 2026",
    headline: "Turning NASA Earth science into local food resilience",
    description:
      "Tlaloc is an agricultural decision-support app for smallholder farmers in El Salvador. It combines NASA climate data, weather forecasts and farmers' own field records to answer one key question: which crop is better suited to my land and the conditions ahead?",
    workspace: "Open workspace",
  },
  es: {
    tag: "NASA Space Apps 2026",
    headline: "Convertimos la ciencia de la Tierra de la NASA en resiliencia alimentaria local",
    description:
      "Tlaloc es una aplicación de apoyo a la decisión agrícola para pequeños productores de El Salvador. Combina datos climáticos de la NASA, pronósticos del tiempo y los registros del propio agricultor para responder una pregunta clave: ¿qué cultivo se adapta mejor a mi terreno y a las condiciones que vienen?",
    workspace: "Abrir workspace",
  },
};

export const navCopy: Record<Lang, {
  home: string;
  about: string;
  workspace: string;
  signIn: string;
  welcome: (name?: string) => string;
  viewProfile: string;
  signOut: string;
  theme: string;
  language: string;
  menu: string;
}> = {
  en: {
    home: "Home",
    about: "About us",
    workspace: "Workspace",
    signIn: "Sign in",
    welcome: (name) => (name ? `Welcome, ${name}` : "Welcome"),
    viewProfile: "View profile",
    signOut: "Sign out",
    theme: "Theme",
    language: "Language",
    menu: "Menu",
  },
  es: {
    home: "Inicio",
    about: "Nosotros",
    workspace: "Workspace",
    signIn: "Iniciar sesión",
    welcome: (name) => (name ? `Bienvenido, ${name}` : "Bienvenido"),
    viewProfile: "Ver perfil",
    signOut: "Cerrar sesión",
    theme: "Tema",
    language: "Idioma",
    menu: "Menú",
  },
};

export const aboutCopy: Record<
  Lang,
  { title: string; tagline: string; intro: string; carey: string; disciplinesLabel: string; disciplines: string }
> = {
  en: {
    title: "Our story",
    tagline: "Local talent. A shared mission.",
    intro:
      "We bring science, technology and business together to turn NASA data into practical solutions for farmers in El Salvador. Our vision: put space-based knowledge to work for people and help our communities build resilience to climate challenges.",
    carey:
      "Half of our team also contributes to Misión Carey, El Salvador's first university CubeSat project, selected through the UNOOSA–JAXA KiboCUBE programme.",
    disciplinesLabel: "Our disciplines",
    disciplines:
      "Business Engineering · Physics · Electrical Engineering · Computer Science · Aeronautical Engineering · Mechatronics Engineering Student",
  },
  es: {
    title: "Nuestra historia",
    tagline: "Talento local. Una misión compartida.",
    intro:
      "Unimos ciencia, tecnología y negocios para convertir datos de la NASA en soluciones útiles para los agricultores de El Salvador. Nuestra visión: poner el conocimiento espacial al servicio de las personas y fortalecer la resiliencia de nuestras comunidades frente a los desafíos climáticos.",
    carey:
      "La mitad del equipo también participa en Misión Carey, el primer proyecto CubeSat universitario de El Salvador, seleccionado por el programa KiboCUBE de UNOOSA y JAXA.",
    disciplinesLabel: "Nuestras disciplinas",
    disciplines:
      "Ingeniería de Negocios · Física · Ingeniería Eléctrica · Ciencias de la Computación · Ingeniería Aeronáutica · Estudiante de Ingeniería Mecatrónica",
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

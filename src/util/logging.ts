export type Logging = {
    info: (message: string) => void;
};

// used in tests and dev mode
const defaultLogging: Logging = {
    info: (message: string) => console.log(message),
};

export default defaultLogging;

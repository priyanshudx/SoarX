import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      '.venv/**',
      'backend/**',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'prefer-const': 'off',
    },
  },
];

export default config;

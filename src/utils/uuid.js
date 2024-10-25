import { v4 as uuidv4 } from 'uuid';

export const userid_generate = () => {
  const uuid = uuidv4();
  localStorage.setItem('userid', uuid);
  return uuid;
};
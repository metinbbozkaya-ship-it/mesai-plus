import React, { createContext, useContext, useState, useCallback } from 'react';

interface MenuContextValue {
  visible: boolean;
  open: () => void;
  close: () => void;
}

const MenuContext = createContext<MenuContextValue>({
  visible: false,
  open: () => {},
  close: () => {},
});

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);
  return (
    <MenuContext.Provider value={{ visible, open, close }}>
      {children}
    </MenuContext.Provider>
  );
}

export const useMenu = () => useContext(MenuContext);

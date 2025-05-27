// components/UI/NestedMenuItem.jsx
import * as React from 'react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ArrowRight from '@mui/icons-material/ArrowRight';

const TRANSPARENT = 'rgba(0,0,0,0)';

const NestedMenuItem = (props, ref) => {
  const {
    //parentMenuOpen,
    label,
    rightIcon = <ArrowRight style={{ fontSize: 16 }} />,
    children,
    className,
    ContainerProps: ContainerPropsProp = {},
    rightAnchored,
    ...MenuItemProps
  } = props;

  const [isSubMenuOpen, setIsSubMenuOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const menuItemRef = React.useRef(null);
  const menuContainerRef = React.useRef(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    setIsSubMenuOpen(true);
  };

  const handleClose = () => {
    setIsSubMenuOpen(false);
  };

  return (
    <div ref={menuContainerRef}>
      <MenuItem
        {...MenuItemProps}
        ref={menuItemRef}
        onClick={handleClick}
        className={className}
      >
        <ListItemIcon>{props.icon}</ListItemIcon>
        <ListItemText>{label}</ListItemText>
        {rightIcon}
      </MenuItem>
      <Menu
        anchorEl={anchorEl}
        open={isSubMenuOpen}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: rightAnchored ? 'left' : 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: rightAnchored ? 'right' : 'left' }}
        autoFocus={false}
        disableAutoFocus
        disableEnforceFocus
      >
        <div ref={menuContainerRef} style={{ pointerEvents: 'auto' }}>
          {children}
        </div>
      </Menu>
    </div>
  );
};

export default NestedMenuItem;

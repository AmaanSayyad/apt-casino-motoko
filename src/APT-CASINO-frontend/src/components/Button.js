import React from "react";
import LoadingButton from "@mui/lab/LoadingButton";
import {
  //alpha,
  styled,
} from "@mui/material/styles";
import { playSound, SOUNDS } from "../utils/sounds";

const TextButton = styled(LoadingButton)(({ theme }) => ({
  textTransform: "none",
  padding: "6px 18px",
  "&:hover": {
    color: theme.palette.text.accent,
  },
}));

const StyledButton = styled(LoadingButton)(({ theme }) => ({
  textTransform: "none",
  borderColor: "linear-gradient(90deg, #681DDB 0%, #D82633 100%)",
}));

export default function CustomButton({
  variant = "outlined",
  fontSize = "0.875rem",
  playClickSound = true,
  ...props
}) {
  const handleClick = (e) => {
    // Play button click sound if enabled
    if (playClickSound) {
      playSound(SOUNDS.buttonClick, { volume: 0.5 });
    }

    // Call the original onClick handler if provided
    if (props.onClick) {
      props.onClick(e);
    }
  };

  return variant === "outlined" ? (
    <StyledButton
      variant={variant}
      color="accent"
      {...props}
      onClick={handleClick}
      sx={{ fontSize: fontSize, ...props.sx }}
    />
  ) : (
    <TextButton
      variant={variant}
      {...props}
      onClick={handleClick}
      sx={{ fontSize: fontSize, ...props.sx }}
    />
  );
}

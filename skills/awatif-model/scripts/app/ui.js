// The design system's globals (React, StructViewer components, AwatifUI helpers)
// as module exports, so components import them like any other dependency.
import "./globals.js";
import "../../../awatif-ui/assets/components/bundle.js";
import "../../../awatif-ui/assets/awatif-ui.js";

export const React = window.React;
export const SV = window.StructViewer;
export const UI = window.AwatifUI;
export const h = React.createElement;
export const F = React.Fragment;
export const { useState, useEffect, useRef, useMemo } = React;

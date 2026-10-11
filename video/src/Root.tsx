import React from "react";
import { Composition } from "remotion";
import { AerisDemo, TOTAL } from "./AerisDemo";
import { FPS, W, H } from "./theme";

export const Root: React.FC = () => <Composition id="AerisDemo" component={AerisDemo} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />;

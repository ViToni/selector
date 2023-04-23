import { defineConfig } from "vite";
import typescript from "@rollup/plugin-typescript";

import * as path from "path";

const projectRootDir = path.resolve(__dirname);
const resolvePath = (str: string) => path.resolve(projectRootDir, str);

export default defineConfig({
    plugins: [
        typescript()
    ],
    build: {
        copyPublicDir: false,   // don't need anything from "public"
        emptyOutDir: true,
        lib: {
            entry: {
                index: resolvePath("src/index.ts"),
                randomUUID: resolvePath("src/randomUUID.ts")
            },
            formats: ["es", "cjs"]
        },
        rollupOptions: {
            output: {
                sourcemap: true
            }
        }
    }
});

//==============================================================================

import { defineConfig } from "vite";
import typescript from "@rollup/plugin-typescript";

import * as path from "path";
import { existsSync, readdirSync, lstatSync, rmdirSync, unlinkSync } from "fs";

const projectRootDir = path.resolve(__dirname);
const resolvePath = (str: string) => path.resolve(projectRootDir, str);

emptyDir(resolvePath("dist"));

export default defineConfig({
    plugins: [
        typescript()
    ],
    build: {
        copyPublicDir: false,   // we don't need anything from "public"
        emptyOutDir: true,
        lib: {
            entry: {
                main: resolvePath("src/main.ts"),
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

function emptyDir(dir: string): void {
    if (!existsSync(dir)) {
        return;
    }

    for (const file of readdirSync(dir)) {
        const abs = path.resolve(dir, file);

        // baseline is Node 12 so can't use rmSync
        if (lstatSync(abs).isDirectory()) {
            emptyDir(abs);
            rmdirSync(abs);
        } else {
            unlinkSync(abs);
        }
    }
}

//==============================================================================

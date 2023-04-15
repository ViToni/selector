import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import typescript from "@rollup/plugin-typescript";

export default defineConfig({
    plugins: [
        dts({
            outputDir: ["dist"]
        }),
        typescript()
    ],
    build: {
        copyPublicDir: false,   // don't need anything from "public"
        emptyOutDir: true,
        lib: {
            entry: {
                main: resolve(__dirname, "src/index.ts"),
                randomUUID: resolve(__dirname, "src/randomUUID.ts")
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

// Single source of truth: package.json "version" field
import { version } from "../../package.json";
export const VERSION = version;
export const APP_NAME = "Vectorscope";
export const APP_TAGLINE = "Internal geometry of open-weight models";
export const CONCEPT_DOI = "10.5281/zenodo.23715047";
export const CITE_LINE =
  "Cite: Berry, D. M. (2026) 'Vector Theory: Epistemology, Political Economy, and Probabilistic Computation', " +
  `Philosophy & Technology, 39. doi:10.1007/s13347-026-01162-w. Tool: ${APP_NAME} v${version}, doi:${CONCEPT_DOI}.`;

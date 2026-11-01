import { StyleSheet } from "react-native";

// Pickle palette v2 - dark bg, bright electric pickle green, cream text
export const ACCENT = "#A3E635";           // electric pickle green
export const ACCENT_DEEP = "#7FB800";      // classic pickle
export const ACCENT_DIM = "#2F4A18";       // shadow green
export const ACCENT_WARM = "#FFD447";      // mustard highlight
export const PASS_RED = "#FF6B6B";         // coral for NAH
export const BG = "#0F1A0B";               // deep jar shadow
export const SURFACE = "#1B2818";
export const SURFACE_LIGHT = "#25341F";
export const TEXT_PRIMARY = "#FFF4D6";     // warm cream
export const TEXT_SECONDARY = "#8FA085";   // muted sage

// font families (loaded by expo-font at app start)
export const FONT_DISPLAY = "BagelFatOne_400Regular";
export const FONT_BODY = "Fredoka_500Medium";
export const FONT_BODY_BOLD = "Fredoka_700Bold";

export default StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG,  maxWidth: 430,width: "100%",
  alignSelf: "center",
  paddingHorizontal: 20, 
  paddingTop: 56 },
  
  centered: { justifyContent: "center", alignItems: "center", gap: 8 },

  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 24 },
  brand: {
    fontSize: 30,
    fontFamily: FONT_DISPLAY,
    color: TEXT_PRIMARY,
    letterSpacing: 1,
  },

  h1: {
    fontFamily: FONT_DISPLAY,
    fontSize: 48,
    color: TEXT_PRIMARY,
    letterSpacing: -1,
    lineHeight: 52,
    marginBottom: 6,
    textAlign: "center",
  },
  h1Accent: { color: ACCENT },
  subtitle: {
    fontSize: 15,
    fontFamily: FONT_BODY,
    color: TEXT_SECONDARY,
    marginBottom: 24,
    textAlign: "center",
  },

  genreGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingBottom: 30 },
  genreCard: {
    width: "47%",
    backgroundColor: SURFACE,
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 2,
    borderColor: ACCENT_DIM,
  },
  genreIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: ACCENT_DIM,
    borderWidth: 1.5,
    borderColor: ACCENT_DEEP,
    alignItems: "center",
    justifyContent: "center",
  },
  genreCardLabel: {
    fontSize: 14,
    fontFamily: FONT_BODY_BOLD,
    color: TEXT_PRIMARY,
    flexShrink: 1,
  },

  primaryBtn: {
    marginTop: 24,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 999,
    backgroundColor: ACCENT,
    borderWidth: 3,
    borderColor: ACCENT_DEEP,
  },
  primaryBtnText: {
    color: BG,
    fontSize: 20,
    fontFamily: FONT_DISPLAY,
    letterSpacing: 1.5,
  },

  swipeTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  backArrow: { fontSize: 28, color: TEXT_SECONDARY, fontFamily: FONT_BODY_BOLD },
  genreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: ACCENT_DIM,
    borderWidth: 2,
    borderColor: ACCENT,
  },
  genreBadgeText: {
    fontSize: 12,
    fontFamily: FONT_BODY_BOLD,
    letterSpacing: 0.6,
    color: ACCENT,
  },
  counter: { fontSize: 15, color: TEXT_SECONDARY, fontFamily: FONT_BODY_BOLD },

  cardWrapper: { height: 650, marginBottom: 14 },
  mainCard: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 32,
    overflow: "hidden",
    backgroundColor: SURFACE,
    borderWidth: 3,
    borderColor: ACCENT_DEEP,
  },
  poster: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  posterFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SURFACE,
  },
  cardGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "55%",
  },

  cardInfo: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 22 },
  movieTitle: {
    fontSize: 32,
    fontFamily: FONT_DISPLAY,
    color: "#fff",
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  movieMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,244,214,0.18)",
  },
  metaPillText: {
    fontSize: 13,
    color: "#fff",
    fontFamily: FONT_BODY_BOLD,
  },
  movieOverview: {
    fontSize: 14,
    fontFamily: FONT_BODY,
    color: "rgba(255,244,214,0.75)",
    lineHeight: 20,
    marginTop: 10,
  },
  moreBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(255,244,214,0.3)",
  },
  moreBtnText: {
    fontSize: 12,
    fontFamily: FONT_BODY_BOLD,
    color: "rgba(255,244,214,0.85)",
    letterSpacing: 0.5,
  },

  // swipe labels - transforms applied inline so scale can animate
  swipeLabel: {
    position: "absolute",
    top: 46,
    zIndex: 10,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 18,
    borderWidth: 5,
    backgroundColor: "rgba(15,26,11,0.55)",
  },
  likeLabel: { right: 20, borderColor: ACCENT },
  passLabel: { left: 20, borderColor: PASS_RED },
  swipeLabelText: { fontSize: 42, fontFamily: FONT_DISPLAY, letterSpacing: 3 },

  // huge center splash on commit
  splashContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
  },
  splashText: {
    fontSize: 110,
    fontFamily: FONT_DISPLAY,
    letterSpacing: 4,
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 18,
  },

  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingBottom: 16,
  },
  actionBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: SURFACE_LIGHT,
    borderWidth: 2,
    borderColor: ACCENT_DIM,
    alignItems: "center",
    justifyContent: "center",
  },
  finishBtn: {
    width: "auto",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 20,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: ACCENT,
    backgroundColor: ACCENT_DIM,
  },
  finishBtnText: {
    fontSize: 14,
    fontFamily: FONT_DISPLAY,
    color: ACCENT,
    letterSpacing: 0.8,
  },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 40,
    maxHeight: "85%",
    borderTopWidth: 3,
    borderColor: ACCENT_DEEP,
  },
  modalClose: {
    alignSelf: "flex-end",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SURFACE_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalPoster: { width: "100%", height: 240, borderRadius: 20, marginBottom: 16 },
  modalTitle: {
    fontSize: 34,
    fontFamily: FONT_DISPLAY,
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
    marginBottom: 8,
    lineHeight: 38,
  },
  modalOverviewText: {
    fontSize: 15,
    fontFamily: FONT_BODY,
    color: "rgba(255,244,214,0.8)",
    lineHeight: 22,
  },

  trailerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: ACCENT,
    borderWidth: 2,
    borderColor: ACCENT_DEEP,
    alignSelf: "flex-start",
  },
  trailerBtnText: {
    fontSize: 15,
    fontFamily: FONT_DISPLAY,
    color: BG,
    letterSpacing: 0.6,
  },

  sectionTitle: {
    fontSize: 18,
    fontFamily: FONT_DISPLAY,
    color: TEXT_PRIMARY,
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 12,
  },
  castCard: { width: 80, marginRight: 12, alignItems: "center" },
  castPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 6,
    backgroundColor: SURFACE_LIGHT,
  },
  castPhotoFallback: { alignItems: "center", justifyContent: "center" },
  castName: {
    fontSize: 12,
    fontFamily: FONT_BODY_BOLD,
    color: TEXT_PRIMARY,
    textAlign: "center",
  },
  castCharacter: {
    fontSize: 11,
    fontFamily: FONT_BODY,
    color: TEXT_SECONDARY,
    textAlign: "center",
  },

  loadingText: {
    fontSize: 16,
    fontFamily: FONT_BODY_BOLD,
    color: TEXT_SECONDARY,
    marginTop: 8,
  },

  finishMascot: {
    marginBottom: 16,
  },
});
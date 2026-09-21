import { createBrowserRouter } from "react-router";
import { CustomerLayout } from "./layouts/CustomerLayout";
import { HomePage } from "./pages/HomePage";
import { ChatPage } from "./pages/ChatPage";
import { PropertiesPage } from "./pages/PropertiesPage";
import { PropertyDetailPage } from "./pages/PropertyDetailPage";
import { AboutPage } from "./pages/AboutPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: CustomerLayout,
    children: [
      { index: true, Component: HomePage },
      { path: "chat", Component: ChatPage },
      { path: "properties", Component: PropertiesPage },
      { path: "properties/:id", Component: PropertyDetailPage },
      { path: "about", Component: AboutPage },
    ],
  },
]);

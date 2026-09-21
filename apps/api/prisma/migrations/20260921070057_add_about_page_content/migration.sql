-- CreateTable
CREATE TABLE "settings_about_content" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "pageTitle" TEXT NOT NULL DEFAULT 'About ERA Cambodia',
    "subtitle" TEXT,
    "paragraph1" TEXT,
    "paragraph2" TEXT,
    "mission" TEXT,
    "values" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "statProjects" TEXT,
    "statLeads" TEXT,
    "statAccuracy" TEXT,
    "statTeamSize" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_about_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings_about_milestones" (
    "id" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "settings_about_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings_about_team_members" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "bio" TEXT,
    "photoUrl" TEXT,
    "isLeader" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "settings_about_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings_about_awards" (
    "id" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "settings_about_awards_pkey" PRIMARY KEY ("id")
);

--
-- PostgreSQL database dump
--

\restrict EeeiybllQPm93qadq2V2mIlSI0pFyMiaYDrUKhGUxd9WwmBhgauQzjfPbuS4uJq

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: CampaignStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."CampaignStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'ENDED',
    'CLOSED'
);


ALTER TYPE public."CampaignStatus" OWNER TO postgres;

--
-- Name: DonationChannel; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DonationChannel" AS ENUM (
    'SMS',
    'EASY_TRANSFER',
    'RECURRING_TRANSFER'
);


ALTER TYPE public."DonationChannel" OWNER TO postgres;

--
-- Name: DonationStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."DonationStatus" AS ENUM (
    'PENDING',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'REFUNDED'
);


ALTER TYPE public."DonationStatus" OWNER TO postgres;

--
-- Name: RecurringStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."RecurringStatus" AS ENUM (
    'ACTIVE',
    'PAUSED',
    'CANCELLED'
);


ALTER TYPE public."RecurringStatus" OWNER TO postgres;

--
-- Name: SettlementStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SettlementStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."SettlementStatus" OWNER TO postgres;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UserRole" AS ENUM (
    'SUPER_ADMIN',
    'ORG_ADMIN'
);


ALTER TYPE public."UserRole" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Account; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Account" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text
);


ALTER TABLE public."Account" OWNER TO postgres;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "userId" text,
    action text NOT NULL,
    "entityType" text,
    "entityId" text,
    detail jsonb,
    "ipAddress" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuditLog" OWNER TO postgres;

--
-- Name: Campaign; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Campaign" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    "coverImageUrl" text,
    "goalAmount" integer NOT NULL,
    "currentAmount" integer DEFAULT 0 NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    summary text,
    story text,
    reason text,
    "usagePlan" text,
    beneficiary text,
    "messageToDonors" text,
    "allowedChannels" text,
    status public."CampaignStatus" DEFAULT 'DRAFT'::public."CampaignStatus" NOT NULL,
    "isPublished" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Campaign" OWNER TO postgres;

--
-- Name: CampaignImage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."CampaignImage" (
    id text NOT NULL,
    "campaignId" text NOT NULL,
    url text NOT NULL,
    caption text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."CampaignImage" OWNER TO postgres;

--
-- Name: Donation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Donation" (
    id text NOT NULL,
    "organizationId" text,
    "donorId" text,
    "campaignId" text,
    channel public."DonationChannel" NOT NULL,
    amount integer NOT NULL,
    status public."DonationStatus" DEFAULT 'PENDING'::public."DonationStatus" NOT NULL,
    "donatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "providerTransactionId" text,
    "providerName" text,
    memo text,
    "smsBody" text,
    "senderPhone" text,
    "recipientNumber" text,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Donation" OWNER TO postgres;

--
-- Name: Donor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Donor" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    name text NOT NULL,
    phone text,
    email text,
    memo text,
    "privacyConsent" boolean DEFAULT false NOT NULL,
    "isRecurring" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Donor" OWNER TO postgres;

--
-- Name: Organization; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Organization" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "logoUrl" text,
    description text,
    address text,
    phone text,
    email text,
    "smsBaseNumber" text DEFAULT '#2540'::text NOT NULL,
    "smsCode" text,
    "smsFullNumber" text,
    "qrCodeUrl" text,
    "bankName" text,
    "bankAccount" text,
    "bankHolder" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Organization" OWNER TO postgres;

--
-- Name: OrganizationAdmin; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."OrganizationAdmin" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "organizationId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."OrganizationAdmin" OWNER TO postgres;

--
-- Name: OrganizationFee; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."OrganizationFee" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    channel public."DonationChannel" NOT NULL,
    "feePercent" double precision DEFAULT 5.0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."OrganizationFee" OWNER TO postgres;

--
-- Name: QrCode; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."QrCode" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "targetUrl" text NOT NULL,
    "imageDataUrl" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "revokedAt" timestamp(3) without time zone
);


ALTER TABLE public."QrCode" OWNER TO postgres;

--
-- Name: RecurringDonation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RecurringDonation" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "donorId" text NOT NULL,
    amount integer NOT NULL,
    "dayOfMonth" integer DEFAULT 25 NOT NULL,
    status public."RecurringStatus" DEFAULT 'ACTIVE'::public."RecurringStatus" NOT NULL,
    "providerContractId" text,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "cancelledAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."RecurringDonation" OWNER TO postgres;

--
-- Name: Session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    "sessionToken" text NOT NULL,
    "userId" text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Session" OWNER TO postgres;

--
-- Name: Settlement; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Settlement" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    period text NOT NULL,
    "scheduledDate" timestamp(3) without time zone NOT NULL,
    "totalAmount" integer DEFAULT 0 NOT NULL,
    "feeAmount" integer DEFAULT 0 NOT NULL,
    "netAmount" integer DEFAULT 0 NOT NULL,
    status public."SettlementStatus" DEFAULT 'PENDING'::public."SettlementStatus" NOT NULL,
    "processedAt" timestamp(3) without time zone,
    "bankName" text,
    "bankAccount" text,
    "bankHolder" text,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Settlement" OWNER TO postgres;

--
-- Name: SettlementItem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SettlementItem" (
    id text NOT NULL,
    "settlementId" text NOT NULL,
    "donationId" text NOT NULL,
    amount integer NOT NULL,
    channel text NOT NULL,
    "donatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SettlementItem" OWNER TO postgres;

--
-- Name: SmsNumberAssignment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SmsNumberAssignment" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "baseNumber" text DEFAULT '#2540'::text NOT NULL,
    code text NOT NULL,
    "fullNumber" text NOT NULL,
    "assignedById" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "assignedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "revokedAt" timestamp(3) without time zone
);


ALTER TABLE public."SmsNumberAssignment" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    "passwordHash" text,
    role public."UserRole" DEFAULT 'ORG_ADMIN'::public."UserRole" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: VerificationToken; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."VerificationToken" (
    identifier text NOT NULL,
    token text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."VerificationToken" OWNER TO postgres;

--
-- Name: WebhookEvent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."WebhookEvent" (
    id text NOT NULL,
    provider text NOT NULL,
    "eventType" text NOT NULL,
    payload jsonb NOT NULL,
    processed boolean DEFAULT false NOT NULL,
    "processedAt" timestamp(3) without time zone,
    error text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."WebhookEvent" OWNER TO postgres;

--
-- Data for Name: Account; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Account" (id, "userId", type, provider, "providerAccountId", refresh_token, access_token, expires_at, token_type, scope, id_token, session_state) FROM stdin;
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AuditLog" (id, "userId", action, "entityType", "entityId", detail, "ipAddress", "createdAt") FROM stdin;
cms7lhhfj00p4pmrwghxs2cjr	cms7lhgg50000pmrwwx5by7lp	ORGANIZATION_CREATE	Organization	cms7lhgja0001pmrwn7cfd1s1	{"name": "따뜻한손길복지재단"}	\N	2026-07-30 14:14:26.431
cms7lhhfq00p6pmrw44cwf8qk	cms7lhgg50000pmrwwx5by7lp	ORGANIZATION_CREATE	Organization	cms7lhgmv0009pmrwzrrzpvuy	{"name": "푸른희망아동센터"}	\N	2026-07-30 14:14:26.438
cms7lhhg000p8pmrwfikht99m	cms7lhgg50000pmrwwx5by7lp	ORGANIZATION_CREATE	Organization	cms7lhgpo000hpmrwas7tp8gt	{"name": "한울타리노인복지회"}	\N	2026-07-30 14:14:26.448
cms7lhhg500papmrw4x60bgov	cms7lhgg50000pmrwwx5by7lp	ORGANIZATION_CREATE	Organization	cms7lhgsr000ppmrwy2j9ydmi	{"name": "빛나는미래장애인센터"}	\N	2026-07-30 14:14:26.453
cms7lhhg700pcpmrwfyjjg25z	cms7lhgg50000pmrwwx5by7lp	ORGANIZATION_CREATE	Organization	cms7lhgvn000xpmrwh1w5vtg2	{"name": "새벽이슬청소년쉼터"}	\N	2026-07-30 14:14:26.456
cms7lhhg900pepmrwewnaqmcp	cms7lhgg50000pmrwwx5by7lp	ORGANIZATION_CREATE	Organization	cms7lhgya0015pmrwm01nat9j	{"name": "행복나눔다문화센터"}	\N	2026-07-30 14:14:26.457
\.


--
-- Data for Name: Campaign; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Campaign" (id, "organizationId", title, slug, "coverImageUrl", "goalAmount", "currentAmount", "startDate", "endDate", summary, story, reason, "usagePlan", beneficiary, "messageToDonors", "allowedChannels", status, "isPublished", "deletedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: CampaignImage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."CampaignImage" (id, "campaignId", url, caption, "sortOrder", "createdAt") FROM stdin;
\.


--
-- Data for Name: Donation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Donation" (id, "organizationId", "donorId", "campaignId", channel, amount, status, "donatedAt", "providerTransactionId", "providerName", memo, "smsBody", "senderPhone", "recipientNumber", "deletedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Donor; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Donor" (id, "organizationId", name, phone, email, memo, "privacyConsent", "isRecurring", "deletedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Organization; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Organization" (id, name, slug, "logoUrl", description, address, phone, email, "smsBaseNumber", "smsCode", "smsFullNumber", "qrCodeUrl", "bankName", "bankAccount", "bankHolder", "isActive", "deletedAt", "createdAt", "updatedAt") FROM stdin;
cms7n6x3g0000ahjz9tzegfhp	시온쉼터	a0000375	\N	\N	\N	\N	\N	#2540	\N	\N	\N	\N	\N	\N	t	\N	2026-07-30 15:02:12.674	2026-07-30 15:02:12.674
cms7n6xgw0004ahjzkb28ld43	동래구 장애인복지관	a0000374	\N	\N	\N	\N	\N	#2540	\N	\N	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.232	2026-07-30 15:02:13.232
cms7n6xh40008ahjzgyi59duz	축구종합센터 펀딩 캠페인	a0000373	\N	\N	\N	\N	\N	#2540	\N	\N	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.241	2026-07-30 15:02:13.241
cms7n6xh9000cahjzogf9dao4	갈거리사회적협동조합	a0000372	\N	\N	\N	\N	\N	#2540	\N	\N	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.245	2026-07-30 15:02:13.245
cms7n6xhd000gahjzxbpl9dgz	독서당	a0000371	\N	\N	\N	\N	\N	#2540	4712	#2540-4712	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.25	2026-07-30 15:02:13.25
cms7n6xhm000mahjzatvcpk2u	(재)내셔널트러스트문화유산기금	a0000370	\N	\N	\N	\N	\N	#2540	4711	#2540-4711	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.259	2026-07-30 15:02:13.259
cms7n6xhu000sahjzbauwroe5	한아름	a0000369	\N	\N	\N	\N	\N	#2540	4710	#2540-4710	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.266	2026-07-30 15:02:13.266
cms7n6xi5000yahjzsqprsx2k	학장종합사회복지관	a0000368	\N	\N	\N	\N	\N	#2540	4709	#2540-4709	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.277	2026-07-30 15:02:13.277
cms7n6xij0014ahjzwnof1dmd	(사)한국의사상자협회	a0000367	\N	\N	\N	\N	\N	#2540	4708	#2540-4708	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.291	2026-07-30 15:02:13.291
cms7n6xiq001aahjz5oj04707	진해장애인인권센터	a0000366	\N	\N	\N	\N	\N	#2540	4707	#2540-4707	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.298	2026-07-30 15:02:13.298
cms7n6xiy001gahjzma0pox2u	사단법인 부산여성의전화	a0000365	\N	\N	\N	\N	\N	#2540	4706	#2540-4706	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.306	2026-07-30 15:02:13.306
cms7n6xj3001mahjzz5pk3aup	수원새벽빛장애인야간학교	a0000364	\N	\N	\N	\N	\N	#2540	4705	#2540-4705	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.311	2026-07-30 15:02:13.311
cms7n6xjf001sahjzx3qczmmh	(사)한국평생교육사협회 경기도안산지회	a0000363	\N	\N	\N	\N	\N	#2540	4704	#2540-4704	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.323	2026-07-30 15:02:13.323
cms7n6xjt001yahjz36e7khne	안산나무를심는장애인야학	a0000362	\N	\N	\N	\N	\N	#2540	4703	#2540-4703	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.338	2026-07-30 15:02:13.338
cms7n6xk30024ahjzwwyp1obe	사단법인 아름다운손길	a0000361	\N	\N	\N	\N	\N	#2540	4702	#2540-4702	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.347	2026-07-30 15:02:13.347
cms7n6xk8002aahjzijrhxlus	관악정다운의료복지사회적협동조합	a0000360	\N	\N	\N	\N	\N	#2540	4701	#2540-4701	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.353	2026-07-30 15:02:13.353
cms7n6xkd002gahjzfzbjt8ay	통일문화연합	a0000359	\N	\N	\N	\N	\N	#2540	4700	#2540-4700	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.358	2026-07-30 15:02:13.358
cms7n6xkj002mahjzeuy6b7ey	선한시민의힘	a0000358	\N	\N	\N	\N	\N	#2540	4699	#2540-4699	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.364	2026-07-30 15:02:13.364
cms7n6xko002sahjzykqxm32c	사랑해	a0000357	\N	\N	\N	\N	\N	#2540	4698	#2540-4698	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.368	2026-07-30 15:02:13.368
cms7n6xl2002yahjz3f7ie9ay	교육공동체더하기	a0000356	\N	\N	\N	\N	\N	#2540	4697	#2540-4697	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.382	2026-07-30 15:02:13.382
cms7n6xlg0034ahjztu96294e	도토리보호작업장	a0000355	\N	\N	\N	\N	\N	#2540	4696	#2540-4696	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.396	2026-07-30 15:02:13.396
cms7n6xlo003aahjzleavghyi	노리울예술협회	a0000354	\N	\N	\N	\N	\N	#2540	4695	#2540-4695	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.404	2026-07-30 15:02:13.404
cms7n6xlv003gahjz3znttl82	(사)축복의 다리	a0000353	\N	\N	\N	\N	\N	#2540	4694	#2540-4694	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.411	2026-07-30 15:02:13.411
cms7n6xm1003mahjz90hnuhia	사단법인 대구여성회	a0000352	\N	\N	\N	\N	\N	#2540	4693	#2540-4693	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.418	2026-07-30 15:02:13.418
cms7n6xmi003sahjz0w1qn4wp	방배노인종합복지관	a0000351	\N	\N	\N	\N	\N	#2540	4692	#2540-4692	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.434	2026-07-30 15:02:13.434
cms7n6xmt003yahjzdqp9jins	파르란도 오케스트라	a0000350	\N	\N	\N	\N	\N	#2540	4691	#2540-4691	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.445	2026-07-30 15:02:13.445
cms7n6xn00044ahjztcyg21oh	행동하는성소수자인권연대	a0000349	\N	\N	\N	\N	\N	#2540	4690	#2540-4690	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.452	2026-07-30 15:02:13.452
cms7n6xn9004aahjz5nys0ib8	(사)파주여성민우회	a0000348	\N	\N	\N	\N	\N	#2540	4689	#2540-4689	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.461	2026-07-30 15:02:13.461
cms7n6xov004gahjzgr7am1rp	굿브리지	a0000347	\N	\N	\N	\N	\N	#2540	4688	#2540-4688	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.519	2026-07-30 15:02:13.519
cms7n6xpk004mahjzn9ulz0o9	노아선교회	a0000346	\N	\N	\N	\N	\N	#2540	4687	#2540-4687	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.544	2026-07-30 15:02:13.544
cms7n6xqw004sahjzqyssk7jt	함께걷기사회적협동조합	a0000345	\N	\N	\N	\N	\N	#2540	4686	#2540-4686	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.592	2026-07-30 15:02:13.592
cms7n6xrc004yahjzpyhhxv6z	(사)한기장쉼터요양원	a0000344	\N	\N	\N	\N	\N	#2540	4685	#2540-4685	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.608	2026-07-30 15:02:13.608
cms7n6xrt0054ahjz1g9xm50u	(사)서울퀴어문화축제조직위원회	a0000343	\N	\N	\N	\N	\N	#2540	6550	#2540-6550	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.625	2026-07-30 15:02:13.625
cms7n6xs5005aahjz9wryu7hj	한국지역아동센터연합회	a0000342	\N	\N	\N	\N	\N	#2540	4684	#2540-4684	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.637	2026-07-30 15:02:13.637
cms7n6xsn005gahjzlvuggg6b	전국개척교회연합회	a0000341	\N	\N	\N	\N	\N	#2540	4683	#2540-4683	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.656	2026-07-30 15:02:13.656
cms7n6xt0005mahjzpuylym74	(사)생명존엄재단	a0000340	\N	\N	\N	\N	\N	#2540	4682	#2540-4682	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.668	2026-07-30 15:02:13.668
cms7n6xtc005sahjz7ydefowb	(사)어독스	a0000339	\N	\N	\N	\N	\N	#2540	4681	#2540-4681	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.68	2026-07-30 15:02:13.68
cms7n6xup005yahjzpefmzzx1	(사)성폭력예방치료센터	a0000338	\N	\N	\N	\N	\N	#2540	4680	#2540-4680	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.729	2026-07-30 15:02:13.729
cms7n6xvi0064ahjzab2is672	재단법인 416재단	a0000337	\N	\N	\N	\N	\N	#2540	4160	#2540-4160	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.758	2026-07-30 15:02:13.758
cms7n6xw0006aahjz5d12ap6u	도로시지켜줄개	a0000336	\N	\N	\N	\N	\N	#2540	4679	#2540-4679	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.776	2026-07-30 15:02:13.776
cms7n6xx8006gahjzafig0sq1	나는부모다협회	a0000335	\N	\N	\N	\N	\N	#2540	4678	#2540-4678	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.82	2026-07-30 15:02:13.82
cms7n6xxs006mahjzbusrjpih	아세아연합신학대학교연합선교총회	a0000334	\N	\N	\N	\N	\N	#2540	4677	#2540-4677	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.84	2026-07-30 15:02:13.84
cms7n6xy6006sahjzqpbi6883	임마누엘지역아동센터	a0000333	\N	\N	\N	\N	\N	#2540	4676	#2540-4676	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.855	2026-07-30 15:02:13.855
cms7n6xyb006yahjz201klog2	사회복지법인 한기장복지재단	a0000332	\N	\N	\N	\N	\N	#2540	4675	#2540-4675	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.86	2026-07-30 15:02:13.86
cms7n6xyl0074ahjzq75ozbj7	서재지역아동센터	a0000331	\N	\N	\N	\N	\N	#2540	4674	#2540-4674	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.87	2026-07-30 15:02:13.87
cms7n6xzk007aahjzb3jeys9k	사단법인 햇살마루	a0000330	\N	\N	\N	\N	\N	#2540	4673	#2540-4673	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.904	2026-07-30 15:02:13.904
cms7n6y0i007gahjzs4gnhogt	로뎀사회적협동조합(오정지역아동센터)	a0000329	\N	\N	\N	\N	\N	#2540	4672	#2540-4672	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.939	2026-07-30 15:02:13.939
cms7n6y11007mahjz6ksi58md	양지지역아동센터	a0000328	\N	\N	\N	\N	\N	#2540	4671	#2540-4671	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.957	2026-07-30 15:02:13.957
cms7n6y1g007sahjz8su4rnsi	국민사랑의회	a0000327	\N	\N	\N	\N	\N	#2540	4670	#2540-4670	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.972	2026-07-30 15:02:13.972
cms7n6y1m007yahjzh7qg434x	사단법인 해피피플	a0000326	\N	\N	\N	\N	\N	#2540	4669	#2540-4669	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.978	2026-07-30 15:02:13.978
cms7n6y1v0084ahjzglcwm5js	(사)이주민과함께	a0000325	\N	\N	\N	\N	\N	#2540	4668	#2540-4668	\N	\N	\N	\N	t	\N	2026-07-30 15:02:13.987	2026-07-30 15:02:13.987
cms7n6y28008aahjznd8v1fhv	구미시 반려동물구조협회	a0000324	\N	\N	\N	\N	\N	#2540	4667	#2540-4667	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.001	2026-07-30 15:02:14.001
cms7n6y2h008gahjz089c1blx	사단법인 두드림글로벌재단	a0000323	\N	\N	\N	\N	\N	#2540	4666	#2540-4666	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.009	2026-07-30 15:02:14.009
cms7n6y2o008mahjzv1yq8b29	주랑지역아동센터	a0000322	\N	\N	\N	\N	\N	#2540	4665	#2540-4665	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.016	2026-07-30 15:02:14.016
cms7n6y2s008sahjzlt6py9s3	보물섬지역아동센터	a0000321	\N	\N	\N	\N	\N	#2540	\N	\N	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.021	2026-07-30 15:02:14.021
cms7n6y2z008wahjzmy2u8x59	금천장애인종합복지관	a0000320	\N	\N	\N	\N	\N	#2540	4663	#2540-4663	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.027	2026-07-30 15:02:14.027
cms7n6y3b0092ahjz0olnvn4a	(사)희망둥지나욧	a0000319	\N	\N	\N	\N	\N	#2540	4662	#2540-4662	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.04	2026-07-30 15:02:14.04
cms7n6yse00qyahjzvxhp0ynd	세이브더칠드런	a0000207	\N	\N	\N	\N	\N	#2540	\N	\N	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.942	2026-07-30 15:21:06.113
cms7n6y3o0098ahjzoynii4gc	(사)세계평화청년학생연합	a0000318	\N	\N	\N	\N	\N	#2540	9650	#2540-9650	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.052	2026-07-30 15:02:14.052
cms7n6y3w009eahjz7jkre4fl	사단법인 코인트리	a0000317	\N	\N	\N	\N	\N	#2540	4661	#2540-4661	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.061	2026-07-30 15:02:14.061
cms7n6y44009kahjz6lrmoux1	(사)아시아교류협회	a0000316	\N	\N	\N	\N	\N	#2540	\N	\N	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.069	2026-07-30 15:02:14.069
cms7n6y4c009oahjz25xap4i3	힐링라이프선교회	a0000315	\N	\N	\N	\N	\N	#2540	4659	#2540-4659	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.077	2026-07-30 15:02:14.077
cms7n6y4p009uahjzle6atcp4	이룸지역아동센터	a0000314	\N	\N	\N	\N	\N	#2540	4658	#2540-4658	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.089	2026-07-30 15:02:14.089
cms7n6y5200a0ahjzgk2dht6s	사회적협동조합 보아스사회공헌재단	a0000313	\N	\N	\N	\N	\N	#2540	4657	#2540-4657	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.102	2026-07-30 15:02:14.102
cms7n6y5700a6ahjzb7yb02kk	온고을지역아동센터	a0000312	\N	\N	\N	\N	\N	#2540	4656	#2540-4656	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.107	2026-07-30 15:02:14.107
cms7n6y5i00acahjztwbtx39e	가온사회적협동조합(소망지역아동센터)	a0000311	\N	\N	\N	\N	\N	#2540	4655	#2540-4655	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.118	2026-07-30 15:02:14.118
cms7n6y5y00aiahjzqvdnmxbz	응암노인복지관	a0000310	\N	\N	\N	\N	\N	#2540	4654	#2540-4654	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.134	2026-07-30 15:02:14.134
cms7n6y6700aoahjzl1halv3s	기독교대한감리회 라이트하우스교회	a0000309	\N	\N	\N	\N	\N	#2540	4653	#2540-4653	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.143	2026-07-30 15:02:14.143
cms7n6y6d00auahjzxioikjj3	윙크	a0000308	\N	\N	\N	\N	\N	#2540	4652	#2540-4652	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.15	2026-07-30 15:02:14.15
cms7n6y6i00b0ahjzsjiwaal9	덕산지역아동센터(충남예산)	a0000307	\N	\N	\N	\N	\N	#2540	4651	#2540-4651	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.154	2026-07-30 15:02:14.154
cms7n6y6r00b6ahjzk4j3aai5	재단법인 대한국인	a0000306	\N	\N	\N	\N	\N	#2540	4650	#2540-4650	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.163	2026-07-30 15:02:14.163
cms7n6y7400bcahjzxnl0ovwm	나눔종합사회복지관	a0000305	\N	\N	\N	\N	\N	#2540	\N	\N	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.176	2026-07-30 15:02:14.176
cms7n6y7d00bgahjzzykwtpgh	두손애장학회	a0000304	\N	\N	\N	\N	\N	#2540	\N	\N	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.185	2026-07-30 15:02:14.185
cms7n6y7k00bkahjz94m6azhw	신애원	a0000303	\N	\N	\N	\N	\N	#2540	\N	\N	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.192	2026-07-30 15:02:14.192
cms7n6y7o00boahjzzqurfh87	국제슬로푸드한국협회	a0000302	\N	\N	\N	\N	\N	#2540	3000	#2540-3000	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.197	2026-07-30 15:02:14.197
cms7n6y7w00buahjzc19l1g36	인천힐링센터	a0000301	\N	\N	\N	\N	\N	#2540	7006	#2540-7006	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.205	2026-07-30 15:02:14.205
cms7n6y8500c0ahjzj1u8rb1j	희망한국	a0000300	\N	\N	\N	\N	\N	#2540	\N	\N	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.213	2026-07-30 15:02:14.213
cms7n6y8g00c4ahjzzsq05tdo	마포장애인주간보호센터	a0000299	\N	\N	\N	\N	\N	#2540	1066	#2540-1066	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.224	2026-07-30 15:02:14.224
cms7n6y8q00caahjzm78h1177	울산동구종합사회복지관	a0000298	\N	\N	\N	\N	\N	#2540	4242	#2540-4242	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.234	2026-07-30 15:02:14.234
cms7n6y8w00cgahjzuwtsa1wt	우리동물병원생명사회적협동조합	a0000297	\N	\N	\N	\N	\N	#2540	7575	#2540-7575	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.241	2026-07-30 15:02:14.241
cms7n6y9100cmahjz0yzgvv1y	진주시민미디어센터	a0000296	\N	\N	\N	\N	\N	#2540	7306	#2540-7306	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.246	2026-07-30 15:02:14.246
cms7n6y9800csahjzegpnrv6l	사단법인광주여성민우회	a0000295	\N	\N	\N	\N	\N	#2540	0383	#2540-0383	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.253	2026-07-30 15:02:14.253
cms7n6y9d00cyahjzkxyhgaij	(사)토닥토닥	a0000294	\N	\N	\N	\N	\N	#2540	7979	#2540-7979	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.257	2026-07-30 15:02:14.257
cms7n6y9i00d4ahjztijnrup6	(사)피스모모	a0000293	\N	\N	\N	\N	\N	#2540	0904	#2540-0904	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.262	2026-07-30 15:02:14.262
cms7n6y9s00daahjzf34gqufp	여성환경연대	a0000292	\N	\N	\N	\N	\N	#2540	3355	#2540-3355	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.272	2026-07-30 15:02:14.272
cms7n6ya400dgahjzf5dhsfi4	사회복지연구소	a0000291	\N	\N	\N	\N	\N	#2540	2560	#2540-2560	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.284	2026-07-30 15:02:14.284
cms7n6yab00dmahjzw3fx4iiv	(사)한국뇌병변장애인인권협회	a0000290	\N	\N	\N	\N	\N	#2540	3161	#2540-3161	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.291	2026-07-30 15:02:14.291
cms7n6yaf00dsahjzvquyvtxt	(사)한국뇌병변장애인인권협회 서울협회	a0000289	\N	\N	\N	\N	\N	#2540	3162	#2540-3162	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.295	2026-07-30 15:02:14.295
cms7n6yak00dyahjz0ukknkyy	사단법인 김포여성의전화	a0000288	\N	\N	\N	\N	\N	#2540	0136	#2540-0136	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.3	2026-07-30 15:02:14.3
cms7n6yaq00e4ahjzk7ccj2g5	한국해비타트	a0000287	\N	\N	\N	\N	\N	#2540	3396	#2540-3396	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.306	2026-07-30 15:02:14.306
cms7n6yb100eaahjznspv6jdp	사단법인인천여성민우회	a0000286	\N	\N	\N	\N	\N	#2540	2848	#2540-2848	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.317	2026-07-30 15:02:14.317
cms7n6yb900egahjznwv9do9j	사단법인 수원여성의전화	a0000285	\N	\N	\N	\N	\N	#2540	0909	#2540-0909	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.325	2026-07-30 15:02:14.325
cms7n6ybg00emahjzchl63xx1	사단법인 서울동북여성민우회	a0000284	\N	\N	\N	\N	\N	#2540	1992	#2540-1992	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.332	2026-07-30 15:02:14.332
cms7n6ybk00esahjzkr2lbj72	사단법인마포희망나눔	a0000283	\N	\N	\N	\N	\N	#2540	7640	#2540-7640	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.337	2026-07-30 15:02:14.337
cms7n6ybp00eyahjzsc7cg64e	인드라망생명공동체	a0000282	\N	\N	\N	\N	\N	#2540	0911	#2540-0911	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.342	2026-07-30 15:02:14.342
cms7n6ybt00f4ahjzdqitw91y	(사)안산여성노동자회	a0000281	\N	\N	\N	\N	\N	#2540	4362	#2540-4362	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.346	2026-07-30 15:02:14.346
cms7n6yc200faahjz55jqqqn8	서울남서여성민우회	a0000280	\N	\N	\N	\N	\N	#2540	1313	#2540-1313	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.354	2026-07-30 15:02:14.354
cms7n6ycc00fgahjzagac094d	겨레하나	a0000279	\N	\N	\N	\N	\N	#2540	0427	#2540-0427	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.365	2026-07-30 15:02:14.365
cms7n6ycm00fmahjzcdjxj8kj	서울환경운동연합	a0000278	\N	\N	\N	\N	\N	#2540	1000	#2540-1000	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.375	2026-07-30 15:02:14.375
cms7n6ycs00fsahjz73wnyhf3	서울강서양천여성의전화	a0000277	\N	\N	\N	\N	\N	#2540	0613	#2540-0613	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.381	2026-07-30 15:02:14.381
cms7n6ycy00fyahjzaqdvk5fl	인구협회 광주성폭력상담소	a0000276	\N	\N	\N	\N	\N	#2540	1366	#2540-1366	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.386	2026-07-30 15:02:14.386
cms7n6yd600g4ahjz8c19mjnw	김포장애인야학	a0000275	\N	\N	\N	\N	\N	#2540	9420	#2540-9420	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.394	2026-07-30 15:02:14.394
cms7n6ydh00gaahjz1t47ak0h	환경운동연합	a0000274	\N	\N	\N	\N	\N	#2540	1515	#2540-1515	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.405	2026-07-30 15:02:14.405
cms7n6ydr00ggahjzkaixq117	한국여성정치네트워크	a0000273	\N	\N	\N	\N	\N	#2540	2030	#2540-2030	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.416	2026-07-30 15:02:14.416
cms7n6ydy00gmahjzym4wfgxz	엔젤프로젝트	a0000272	\N	\N	\N	\N	\N	#2540	0179	#2540-0179	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.422	2026-07-30 15:02:14.422
cms7n6ye100gsahjz864gcmyk	행동하는 동물사랑	a0000271	\N	\N	\N	\N	\N	#2540	6279	#2540-6279	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.426	2026-07-30 15:02:14.426
cms7n6ye500gyahjz7fs0u46p	젠더정치연구소	a0000270	\N	\N	\N	\N	\N	#2540	1122	#2540-1122	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.43	2026-07-30 15:02:14.43
cms7n6yee00h4ahjzkj7ndgrn	울산여성의전화	a0000269	\N	\N	\N	\N	\N	#2540	9988	#2540-9988	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.438	2026-07-30 15:02:14.438
cms7n6yem00haahjzn8d1oys0	다사랑공동체	a0000268	\N	\N	\N	\N	\N	#2540	1101	#2540-1101	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.447	2026-07-30 15:02:14.447
cms7n6yev00hgahjzi1ef8dii	시립남부장애인종합복지관	a0000267	\N	\N	\N	\N	\N	#2540	010	#2540-010	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.455	2026-07-30 15:02:14.455
cms7n6yf100hmahjzorg904hm	사단법인 글로벌투게더	a0000266	\N	\N	\N	\N	\N	#2540	2540	#2540-2540	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.461	2026-07-30 15:02:14.461
cms7n6yf800hsahjzj0nbxdun	사단법인 복지국가소사이어티	a0000265	\N	\N	\N	\N	\N	#2540	2353	#2540-2353	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.469	2026-07-30 15:02:14.469
cms7n6yfd00hyahjzvqx952k9	유네스코 한국위원회	a0000264	\N	\N	\N	\N	\N	#2540	2	#2540-2	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.473	2026-07-30 15:02:14.473
cms7n6yfh00i4ahjzcf4xqdn8	(사회복지법인) 대한불교조계종사회복지재단	a0000263	\N	\N	\N	\N	\N	#2540	5101	#2540-5101	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.477	2026-07-30 15:02:14.477
cms7n6yfm00iaahjzp8bl69mk	사단법인 복음의전함	a0000262	\N	\N	\N	\N	\N	#2540	7697	#2540-7697	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.483	2026-07-30 15:02:14.483
cms7n6yft00igahjzbcoo4nd6	사단법인 푸른아시아	a0000261	\N	\N	\N	\N	\N	#2540	1460	#2540-1460	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.489	2026-07-30 15:02:14.489
cms7n6yg600imahjz9pjc1kgw	(사단)한국조혈모세포은행협회	a0000260	\N	\N	\N	\N	\N	#2540	1004	#2540-1004	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.502	2026-07-30 15:02:14.502
cms7n6ygd00isahjzsvqjeofl	사단법인 생명지대	a0000259	\N	\N	\N	\N	\N	#2540	\N	\N	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.509	2026-07-30 15:02:14.509
cms7n6ygi00iwahjzxu9v0t77	사단법인 함께하는한숲	a0000258	\N	\N	\N	\N	\N	#2540	1053	#2540-1053	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.514	2026-07-30 15:02:14.514
cms7n6ygm00j2ahjzzd3cpxtk	바다사랑해군장학재단	a0000257	\N	\N	\N	\N	\N	#2540	111	#2540-111	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.518	2026-07-30 15:02:14.518
cms7n6ygq00j8ahjzofs4vyuh	한민족복지재단	a0000256	\N	\N	\N	\N	\N	#2540	4000	#2540-4000	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.523	2026-07-30 15:02:14.523
cms7n6ygw00jeahjz0uvuv3ui	국제나눔연대	a0000255	\N	\N	\N	\N	\N	#2540	4201	#2540-4201	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.528	2026-07-30 15:02:14.528
cms7n6yh100jkahjzslj16cl0	한국성적소수자문화인권센터	a0000254	\N	\N	\N	\N	\N	#2540	8080	#2540-8080	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.533	2026-07-30 15:02:14.533
cms7n6yhd00jqahjza3r5lmnl	비온뒤무지개	a0000253	\N	\N	\N	\N	\N	#2540	1365	#2540-1365	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.545	2026-07-30 15:02:14.545
cms7n6yhn00jwahjzeiwg0ky2	사단법인 희망래일	a0000252	\N	\N	\N	\N	\N	#2540	7788	#2540-7788	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.556	2026-07-30 15:02:14.556
cms7n6yht00k2ahjz4z572l36	재단법인 승일희망재단	a0000251	\N	\N	\N	\N	\N	#2540	7	#2540-7	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.561	2026-07-30 15:02:14.561
cms7n6yhy00k8ahjz90h89mk8	친구사이	a0000250	\N	\N	\N	\N	\N	#2540	7942	#2540-7942	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.566	2026-07-30 15:02:14.566
cms7n6yi300keahjzxtmdr87w	뚝딱장난감	a0000249	\N	\N	\N	\N	\N	#2540	1510	#2540-1510	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.571	2026-07-30 15:02:14.571
cms7n6yib00kkahjzc5003dsf	경상남도아동보호전문기관	a0000248	\N	\N	\N	\N	\N	#2540	1391	#2540-1391	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.579	2026-07-30 15:02:14.579
cms7n6yis00kqahjzbzsm2c80	유엔환경계획한국협회	a0000247	\N	\N	\N	\N	\N	#2540	1011	#2540-1011	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.597	2026-07-30 15:02:14.597
cms7n6yj200kwahjzam9bo7lg	경남종합사회복지관	a0000246	\N	\N	\N	\N	\N	#2540	8600	#2540-8600	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.607	2026-07-30 15:02:14.607
cms7n6yj800l2ahjzsc54j345	재단법인 아름다운 동행	a0000245	\N	\N	\N	\N	\N	#2540	9595	#2540-9595	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.612	2026-07-30 15:02:14.612
cms7n6yjg00l8ahjz66ua6jv2	사단법인 글로벌호프	a0000244	\N	\N	\N	\N	\N	#2540	5500	#2540-5500	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.62	2026-07-30 15:02:14.62
cms7n6yjp00leahjz0z2w5cgu	인터넷뉴스 신문고	a0000243	\N	\N	\N	\N	\N	#2540	\N	\N	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.63	2026-07-30 15:02:14.63
cms7n6yk500liahjzncpguc0s	사단법인 사랑나눔전국네트워크	a0000242	\N	\N	\N	\N	\N	#2540	\N	\N	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.645	2026-07-30 15:02:14.645
cms7n6ykg00lmahjzbrodlne4	kh TV	a0000241	\N	\N	\N	\N	\N	#2540	0700	#2540-0700	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.656	2026-07-30 15:02:14.656
cms7n6ykl00lsahjzx8a8wazy	(사)프렌드아시아	a0000240	\N	\N	\N	\N	\N	#2540	8045	#2540-8045	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.662	2026-07-30 15:02:14.662
cms7n6yku00lyahjzx6wymen3	사단법인 비전케어	a0000239	\N	\N	\N	\N	\N	#2540	2020	#2540-2020	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.671	2026-07-30 15:02:14.671
cms7n6yl700m4ahjzcqkt2smg	(사) 부스러기사랑나눔회	a0000238	\N	\N	\N	\N	\N	#2540	1265	#2540-1265	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.683	2026-07-30 15:02:14.683
cms7n6ylp00maahjzi45o6zq7	사단법인 인순이와 좋은 사람들	a0000237	\N	\N	\N	\N	\N	#2540	5004	#2540-5004	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.701	2026-07-30 15:02:14.701
cms7n6ylu00mgahjz84u2nnuz	대한불교조계종 유지재단	a0000236	\N	\N	\N	\N	\N	#2540	1027	#2540-1027	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.706	2026-07-30 15:02:14.706
cms7n6ym400mmahjzg88tim8h	사단법인 난치병아동돕기운동본부	a0000235	\N	\N	\N	\N	\N	#2540	7777	#2540-7777	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.716	2026-07-30 15:02:14.716
cms7n6ymk00msahjzqylpvcgc	한국복음서원(생명의흐름TV)	a0000234	\N	\N	\N	\N	\N	#2540	0881	#2540-0881	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.732	2026-07-30 15:02:14.732
cms7n6ymt00myahjzu2xj1w61	희망을 파는 사람들(대구)	a0000233	\N	\N	\N	\N	\N	#2540	8	#2540-8	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.741	2026-07-30 15:02:14.741
cms7n6ymz00n4ahjz9ks0um88	(사)한국성폭력상담소	a0000232	\N	\N	\N	\N	\N	#2540	1991	#2540-1991	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.747	2026-07-30 15:02:14.747
cms7n6yn600naahjzm7tedyia	강릉씨네마떼끄	a0000231	\N	\N	\N	\N	\N	#2540	7415	#2540-7415	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.755	2026-07-30 15:02:14.755
cms7n6ync00ngahjzszhlfe9j	대안문화연대 민들레의 꿈	a0000230	\N	\N	\N	\N	\N	#2540	\N	\N	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.761	2026-07-30 15:02:14.761
cms7n6ynj00nkahjzj3mchf9t	광명여성의전화	a0000229	\N	\N	\N	\N	\N	#2540	1998	#2540-1998	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.768	2026-07-30 15:02:14.768
cms7n6yo000nqahjzqfsk9oh7	한국청소년보호협회	a0000228	\N	\N	\N	\N	\N	#2540	\N	\N	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.784	2026-07-30 15:02:14.784
cms7n6yo800nuahjzpjh98358	(사)한국여성단체연합	a0000227	\N	\N	\N	\N	\N	#2540	0308	#2540-0308	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.792	2026-07-30 15:02:14.792
cms7n6yod00o0ahjzok895vp1	대구여성의전화	a0000226	\N	\N	\N	\N	\N	#2540	6484	#2540-6484	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.798	2026-07-30 15:02:14.798
cms7n6yol00o6ahjzxkfkbfeb	사단법인 고양파주여성민우회	a0000225	\N	\N	\N	\N	\N	#2540	\N	\N	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.805	2026-07-30 15:02:14.805
cms7n6yor00oaahjzs6gqqdl4	인권교육센터 들	a0000224	\N	\N	\N	\N	\N	#2540	5353	#2540-5353	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.811	2026-07-30 15:02:14.811
cms7n6yp400ogahjzpmbckmox	강화여성의전화	a0000223	\N	\N	\N	\N	\N	#2540	1994	#2540-1994	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.824	2026-07-30 15:02:14.824
cms7n6ypf00omahjz1fa9fe37	성매매문제해결을위한전국연대	a0000222	\N	\N	\N	\N	\N	#2540	0923	#2540-0923	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.835	2026-07-30 15:02:14.835
cms7n6ypl00osahjzfmoyzmyi	(사)광주여성의전화	a0000221	\N	\N	\N	\N	\N	#2540	0442	#2540-0442	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.841	2026-07-30 15:02:14.841
cms7n6ypp00oyahjzfjfrchdt	군포여성민우회	a0000220	\N	\N	\N	\N	\N	#2540	1999	#2540-1999	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.845	2026-07-30 15:02:14.845
cms7n6ypx00p4ahjzfkwono35	춘천여성민우회	a0000219	\N	\N	\N	\N	\N	#2540	9964	#2540-9964	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.854	2026-07-30 15:02:14.854
cms7n6yq900paahjzirqktxdc	재단법인 한국메이크어위시소원별재단	a0000218	\N	\N	\N	\N	\N	#2540	0318	#2540-0318	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.865	2026-07-30 15:02:14.865
cms7n6yqi00pgahjzb39o1z3s	경기장애인자립생활센터협의회 안산시지부	a0000217	\N	\N	\N	\N	\N	#2540	\N	\N	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.875	2026-07-30 15:02:14.875
cms7n6yqp00pkahjzjnj6hd0o	대학입시거부로 삶을 바꾸는 투명가방끈	a0000216	\N	\N	\N	\N	\N	#2540	2011	#2540-2011	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.881	2026-07-30 15:02:14.881
cms7n6yqu00pqahjz3dqs9qd2	사단법인 한국나눔연맹	a0000215	\N	\N	\N	\N	\N	#2540	1001	#2540-1001	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.886	2026-07-30 15:02:14.886
cms7n6yqz00pwahjzq9xkjial	한국여성민우회	a0000214	\N	\N	\N	\N	\N	#2540	3838	#2540-3838	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.891	2026-07-30 15:02:14.891
cms7n6yr800q2ahjz7lwudkyl	(사)한국여성의전화	a0000213	\N	\N	\N	\N	\N	#2540	1983	#2540-1983	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.9	2026-07-30 15:02:14.9
cms7n6yrj00q8ahjza1p1d8yh	나눔과나눔	a0000212	\N	\N	\N	\N	\N	#2540	3412	#2540-3412	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.912	2026-07-30 15:02:14.912
cms7n6yrt00qeahjzjtgfko0d	경제정의실천시민연합	a0000211	\N	\N	\N	\N	\N	#2540	1989	#2540-1989	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.921	2026-07-30 15:02:14.921
cms7n6ys000qkahjzcssfy2q9	(주)여성신문사	a0000210	\N	\N	\N	\N	\N	#2540	9300	#2540-9300	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.929	2026-07-30 15:02:14.929
cms7n6ys500qqahjz85v6hqv5	NGO 엔지오	a0000209	\N	\N	\N	\N	\N	#2540	\N	\N	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.934	2026-07-30 15:02:14.934
cms7n6ysa00quahjzlh12n5iw	월드라인	a0000208	\N	\N	\N	\N	\N	#2540	\N	\N	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.939	2026-07-30 15:02:14.939
cms7n6ysi00r2ahjz0fqitwmq	목동 천주교	a0000206	\N	\N	\N	\N	\N	#2540	\N	\N	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.946	2026-07-30 15:02:14.946
cms7n6ysr00r6ahjzrm57zwnj	실망이음	a0000205	\N	\N	\N	\N	\N	#2540	\N	\N	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.955	2026-07-30 15:02:14.955
cms7n6yt100raahjz0nrbt3ye	굿네이버스	a0000203	\N	\N	\N	\N	\N	#2540	\N	\N	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.965	2026-07-30 15:02:14.965
cms7n6yt800reahjzh6dgk39u	강화도 봉은사	a0000202	\N	\N	\N	\N	\N	#2540	\N	\N	\N	\N	\N	\N	t	\N	2026-07-30 15:02:14.972	2026-07-30 15:02:14.972
\.


--
-- Data for Name: OrganizationAdmin; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."OrganizationAdmin" (id, "userId", "organizationId", "createdAt") FROM stdin;
cms7n6xgp0003ahjzwoan2sc2	cms7n6xgl0001ahjzslf77sry	cms7n6x3g0000ahjz9tzegfhp	2026-07-30 15:02:13.226
cms7n6xh10007ahjzogw1edpt	cms7n6xgz0005ahjz8zl3pe0t	cms7n6xgw0004ahjzkb28ld43	2026-07-30 15:02:13.238
cms7n6xh8000bahjzp1v933jv	cms7n6xh60009ahjzcdjaxyp7	cms7n6xh40008ahjzgyi59duz	2026-07-30 15:02:13.244
cms7n6xhc000fahjz6duu2hy6	cms7n6xha000dahjz56ms9srb	cms7n6xh9000cahjzogf9dao4	2026-07-30 15:02:13.248
cms7n6xhh000jahjz5xzd1ap9	cms7n6xhf000hahjzr9zqezun	cms7n6xhd000gahjzxbpl9dgz	2026-07-30 15:02:13.253
cms7n6xhp000pahjzi7gvf093	cms7n6xho000nahjzdjqncaf3	cms7n6xhm000mahjzatvcpk2u	2026-07-30 15:02:13.262
cms7n6xhz000vahjztvpv8hr2	cms7n6xhx000tahjzjzzvvcxo	cms7n6xhu000sahjzbauwroe5	2026-07-30 15:02:13.271
cms7n6xid0011ahjzbti1ulwk	cms7n6xi8000zahjz5dn09twp	cms7n6xi5000yahjzsqprsx2k	2026-07-30 15:02:13.285
cms7n6xim0017ahjzq3yc13kd	cms7n6xil0015ahjzwdhvva8p	cms7n6xij0014ahjzwnof1dmd	2026-07-30 15:02:13.294
cms7n6xit001dahjzgo3swliu	cms7n6xis001bahjzcoypugmt	cms7n6xiq001aahjz5oj04707	2026-07-30 15:02:13.302
cms7n6xj0001jahjz6z115fva	cms7n6xj0001hahjz5ccgavwt	cms7n6xiy001gahjzma0pox2u	2026-07-30 15:02:13.309
cms7n6xj8001pahjzq5p19syi	cms7n6xj4001nahjzzwm11njw	cms7n6xj3001mahjzz5pk3aup	2026-07-30 15:02:13.317
cms7n6xjm001vahjzwt1jbdna	cms7n6xjh001tahjzq80ct8nh	cms7n6xjf001sahjzx3qczmmh	2026-07-30 15:02:13.33
cms7n6xjz0021ahjz5ljyha1o	cms7n6xjw001zahjzpz0k8w10	cms7n6xjt001yahjz36e7khne	2026-07-30 15:02:13.343
cms7n6xk60027ahjzyofh23n7	cms7n6xk50025ahjz9rq6u6u9	cms7n6xk30024ahjzwwyp1obe	2026-07-30 15:02:13.35
cms7n6xkb002dahjzt2wimld0	cms7n6xka002bahjz1ogcfqaf	cms7n6xk8002aahjzijrhxlus	2026-07-30 15:02:13.355
cms7n6xkg002jahjzzm3xk1k5	cms7n6xkf002hahjz2wr7a5tn	cms7n6xkd002gahjzfzbjt8ay	2026-07-30 15:02:13.36
cms7n6xkm002pahjzr1foarg9	cms7n6xkl002nahjzcqhf12t7	cms7n6xkj002mahjzeuy6b7ey	2026-07-30 15:02:13.366
cms7n6xkr002vahjznr2ofolo	cms7n6xkq002tahjz2cux43ow	cms7n6xko002sahjzykqxm32c	2026-07-30 15:02:13.371
cms7n6xla0031ahjzanqs8ohc	cms7n6xl7002zahjziec9p9ej	cms7n6xl2002yahjz3f7ie9ay	2026-07-30 15:02:13.39
cms7n6xlk0037ahjzc0l5aa7w	cms7n6xli0035ahjzqd6xe358	cms7n6xlg0034ahjztu96294e	2026-07-30 15:02:13.401
cms7n6xlr003dahjzzhn2c33e	cms7n6xlp003bahjz4gwjjzwc	cms7n6xlo003aahjzleavghyi	2026-07-30 15:02:13.408
cms7n6xlx003jahjzyfeafj8s	cms7n6xlw003hahjzhkyu1zwt	cms7n6xlv003gahjz3znttl82	2026-07-30 15:02:13.414
cms7n6xm7003pahjz4lttweq7	cms7n6xm3003nahjzx6c35rbt	cms7n6xm1003mahjz90hnuhia	2026-07-30 15:02:13.423
cms7n6xmo003vahjz96cztfv5	cms7n6xmm003tahjzhpmcjszh	cms7n6xmi003sahjz0w1qn4wp	2026-07-30 15:02:13.441
cms7n6xmw0041ahjzssa4f1l2	cms7n6xmv003zahjzw0vu6d4n	cms7n6xmt003yahjzdqp9jins	2026-07-30 15:02:13.448
cms7n6xn50047ahjzeueccybk	cms7n6xn30045ahjz9qwgrzj3	cms7n6xn00044ahjztcyg21oh	2026-07-30 15:02:13.457
cms7n6xoc004dahjzvcd35vy2	cms7n6xo5004bahjzdy7p69xe	cms7n6xn9004aahjz5nys0ib8	2026-07-30 15:02:13.5
cms7n6xp5004jahjzgtbr104n	cms7n6xoy004hahjz9zdv8oei	cms7n6xov004gahjzgr7am1rp	2026-07-30 15:02:13.53
cms7n6xq8004pahjz7as9p4l1	cms7n6xq0004nahjzwm1l23ow	cms7n6xpk004mahjzn9ulz0o9	2026-07-30 15:02:13.569
cms7n6xr1004vahjzhlx7imu6	cms7n6xqy004tahjz6ublai1z	cms7n6xqw004sahjzqyssk7jt	2026-07-30 15:02:13.597
cms7n6xrj0051ahjz912uk3x8	cms7n6xrf004zahjz5hgg03ip	cms7n6xrc004yahjzpyhhxv6z	2026-07-30 15:02:13.615
cms7n6xrx0057ahjzlqk2ncsb	cms7n6xrv0055ahjzpasun5to	cms7n6xrt0054ahjz1g9xm50u	2026-07-30 15:02:13.629
cms7n6xsc005dahjzciq2gao2	cms7n6xs9005bahjzgakxdcmp	cms7n6xs5005aahjz9wryu7hj	2026-07-30 15:02:13.644
cms7n6xst005jahjzh48u06vd	cms7n6xsq005hahjztys9tc7x	cms7n6xsn005gahjzlvuggg6b	2026-07-30 15:02:13.661
cms7n6xt3005pahjz7kcxs3io	cms7n6xt2005nahjzgtjr7sbn	cms7n6xt0005mahjzpuylym74	2026-07-30 15:02:13.672
cms7n6xtw005vahjzh20f3b5v	cms7n6xtl005tahjzk5se20no	cms7n6xtc005sahjz7ydefowb	2026-07-30 15:02:13.7
cms7n6xuw0061ahjzimh1z2eq	cms7n6xus005zahjz1zdxdyir	cms7n6xup005yahjzpefmzzx1	2026-07-30 15:02:13.737
cms7n6xvp0067ahjzmpy69vja	cms7n6xvm0065ahjz5bk4t279	cms7n6xvi0064ahjzab2is672	2026-07-30 15:02:13.765
cms7n6xwe006dahjzcs2u41hf	cms7n6xw3006bahjzv8ly3ssv	cms7n6xw0006aahjz5d12ap6u	2026-07-30 15:02:13.791
cms7n6xxf006jahjzu3h3uqm7	cms7n6xxc006hahjzln6xlqdt	cms7n6xx8006gahjzafig0sq1	2026-07-30 15:02:13.827
cms7n6xxw006pahjzcn8r6jz3	cms7n6xxu006nahjzs6px51hn	cms7n6xxs006mahjzbusrjpih	2026-07-30 15:02:13.845
cms7n6xy9006vahjzzxbixnme	cms7n6xy8006tahjzcnae8c0r	cms7n6xy6006sahjzqpbi6883	2026-07-30 15:02:13.857
cms7n6xyh0071ahjz8nuwyzyy	cms7n6xyf006zahjzl2m7ypt2	cms7n6xyb006yahjz201klog2	2026-07-30 15:02:13.865
cms7n6xz30077ahjzpna7skur	cms7n6xyr0075ahjzcgp9bywl	cms7n6xyl0074ahjzq75ozbj7	2026-07-30 15:02:13.886
cms7n6xzw007dahjzui8bvopl	cms7n6xzq007bahjzcisju1qb	cms7n6xzk007aahjzb3jeys9k	2026-07-30 15:02:13.916
cms7n6y0u007jahjzf5dr3bn0	cms7n6y0s007hahjz4e5d6ej3	cms7n6y0i007gahjzs4gnhogt	2026-07-30 15:02:13.951
cms7n6y1b007pahjzchzz7aqg	cms7n6y14007nahjzr6r739c2	cms7n6y11007mahjz6ksi58md	2026-07-30 15:02:13.967
cms7n6y1k007vahjzixuu87wx	cms7n6y1i007tahjzcboncoeq	cms7n6y1g007sahjz8su4rnsi	2026-07-30 15:02:13.976
cms7n6y1p0081ahjzzpapxu1i	cms7n6y1n007zahjzry2ykqtw	cms7n6y1m007yahjzh7qg434x	2026-07-30 15:02:13.982
cms7n6y230087ahjzigh7kfij	cms7n6y1z0085ahjzkaj1njcu	cms7n6y1v0084ahjzglcwm5js	2026-07-30 15:02:13.995
cms7n6y2d008dahjzo5z4zwie	cms7n6y2b008bahjzittqa05h	cms7n6y28008aahjznd8v1fhv	2026-07-30 15:02:14.005
cms7n6y2j008jahjz2ns0y6mm	cms7n6y2i008hahjzdnstnygz	cms7n6y2h008gahjz089c1blx	2026-07-30 15:02:14.012
cms7n6y2q008pahjzzg0ctfj8	cms7n6y2p008nahjzjor33479	cms7n6y2o008mahjzv1yq8b29	2026-07-30 15:02:14.018
cms7n6y2x008vahjzwcvki0ez	cms7n6y2u008tahjz4qzuwqo5	cms7n6y2s008sahjzlt6py9s3	2026-07-30 15:02:14.025
cms7n6y34008zahjzuzpp5xu2	cms7n6y32008xahjzny79aldo	cms7n6y2z008wahjzmy2u8x59	2026-07-30 15:02:14.032
cms7n6y3i0095ahjzqucdvq2p	cms7n6y3f0093ahjz1ycap41j	cms7n6y3b0092ahjz0olnvn4a	2026-07-30 15:02:14.046
cms7n6y3t009bahjzf02asbod	cms7n6y3r0099ahjz3khpqzuv	cms7n6y3o0098ahjzoynii4gc	2026-07-30 15:02:14.057
cms7n6y3z009hahjzelj7uzp0	cms7n6y3y009fahjz8x8d1ooy	cms7n6y3w009eahjz7jkre4fl	2026-07-30 15:02:14.064
cms7n6y49009nahjzmd9gbxog	cms7n6y46009lahjzg5ypx4qw	cms7n6y44009kahjz6lrmoux1	2026-07-30 15:02:14.074
cms7n6y4j009rahjzybyg93gm	cms7n6y4f009pahjz8f3sglhw	cms7n6y4c009oahjz25xap4i3	2026-07-30 15:02:14.084
cms7n6y4u009xahjzu1alnl3i	cms7n6y4s009vahjzhewlb25c	cms7n6y4p009uahjzle6atcp4	2026-07-30 15:02:14.095
cms7n6y5400a3ahjz1lv2ulws	cms7n6y5300a1ahjzudhyhwvs	cms7n6y5200a0ahjzgk2dht6s	2026-07-30 15:02:14.105
cms7n6y5n00afahjzz7frobgx	cms7n6y5l00adahjz0rvz1b3f	cms7n6y5i00acahjztwbtx39e	2026-07-30 15:02:14.124
cms7n6y6300alahjzltz4j0ms	cms7n6y6000ajahjzc7ldexg1	cms7n6y5y00aiahjzqvdnmxbz	2026-07-30 15:02:14.139
cms7n6y6a00arahjzn91zzv6b	cms7n6y6800apahjzgctdxcv7	cms7n6y6700aoahjzl1halv3s	2026-07-30 15:02:14.146
cms7n6y6f00axahjz7369312c	cms7n6y6f00avahjzoksvdkds	cms7n6y6d00auahjzxioikjj3	2026-07-30 15:02:14.152
cms7n6y6m00b3ahjz8315k8h2	cms7n6y6k00b1ahjz72mfwh8h	cms7n6y6i00b0ahjzsjiwaal9	2026-07-30 15:02:14.158
cms7n6y6x00b9ahjzrvyjhmr6	cms7n6y6t00b7ahjzc46dt7b8	cms7n6y6r00b6ahjzk4j3aai5	2026-07-30 15:02:14.169
cms7n6y7a00bfahjzrfrnwy2w	cms7n6y7700bdahjzedh8yq7q	cms7n6y7400bcahjzxnl0ovwm	2026-07-30 15:02:14.183
cms7n6y7h00bjahjze3v28esh	cms7n6y7f00bhahjzght0vph0	cms7n6y7d00bgahjzzykwtpgh	2026-07-30 15:02:14.189
cms7n6y7n00bnahjzoyyv0eda	cms7n6y7m00blahjzyk9dl270	cms7n6y7k00bkahjz94m6azhw	2026-07-30 15:02:14.195
cms7n6y7s00brahjzi9tiqptq	cms7n6y7r00bpahjzwpm5shcg	cms7n6y7o00boahjzzqurfh87	2026-07-30 15:02:14.2
cms7n6y8100bxahjzf32p6oay	cms7n6y8000bvahjzjwefhv1q	cms7n6y7w00buahjzc19l1g36	2026-07-30 15:02:14.209
cms7n6y8d00c3ahjz6xnvi3nm	cms7n6y8800c1ahjzulqq2ndg	cms7n6y8500c0ahjzj1u8rb1j	2026-07-30 15:02:14.221
cms7n6y8u00cdahjzzhl9tauh	cms7n6y8t00cbahjzl1xz58hq	cms7n6y8q00caahjzm78h1177	2026-07-30 15:02:14.238
cms7n6y8z00cjahjzq71yu8at	cms7n6y8y00chahjzxmort2ta	cms7n6y8w00cgahjzuwtsa1wt	2026-07-30 15:02:14.243
cms7n6y9400cpahjzzkwpts4c	cms7n6y9200cnahjzmn2e6863	cms7n6y9100cmahjz0yzgvv1y	2026-07-30 15:02:14.249
cms7n6y9a00cvahjzppblxyhh	cms7n6y9900ctahjzjr3qqs2y	cms7n6y9800csahjzegpnrv6l	2026-07-30 15:02:14.255
cms7n6y9f00d1ahjznd8i0yke	cms7n6y9e00czahjzq4z5wuxq	cms7n6y9d00cyahjzkxyhgaij	2026-07-30 15:02:14.259
cms7n6y9m00d7ahjz993owemy	cms7n6y9k00d5ahjztqu5d0yv	cms7n6y9i00d4ahjztijnrup6	2026-07-30 15:02:14.267
cms7n6y9z00ddahjzlkzhk7y5	cms7n6y9w00dbahjz2lposjsw	cms7n6y9s00daahjzf34gqufp	2026-07-30 15:02:14.279
cms7n6ya800djahjzfaiv7op2	cms7n6ya600dhahjz9tulz9ow	cms7n6ya400dgahjzf5dhsfi4	2026-07-30 15:02:14.288
cms7n6yad00dpahjz3hppvb4j	cms7n6yac00dnahjz8a8u1yai	cms7n6yab00dmahjzw3fx4iiv	2026-07-30 15:02:14.293
cms7n6yah00dvahjzcehbtmaw	cms7n6yag00dtahjzmansgm1k	cms7n6yaf00dsahjzvquyvtxt	2026-07-30 15:02:14.298
cms7n6yan00e1ahjz3fom7h1f	cms7n6yal00dzahjzkp3b9c6j	cms7n6yak00dyahjz0ukknkyy	2026-07-30 15:02:14.303
cms7n6yas00e7ahjz0bxf68ib	cms7n6yar00e5ahjz7elnxvll	cms7n6yaq00e4ahjzk7ccj2g5	2026-07-30 15:02:14.309
cms7n6yb500edahjzd4glqdt5	cms7n6yb300ebahjz4e3aqtct	cms7n6yb100eaahjznspv6jdp	2026-07-30 15:02:14.322
cms7n6ybc00ejahjzh7bel4re	cms7n6ybb00ehahjz9xpeznki	cms7n6yb900egahjznwv9do9j	2026-07-30 15:02:14.329
cms7n6ybi00epahjzgjobew0m	cms7n6ybh00enahjzwxj37a6s	cms7n6ybg00emahjzchl63xx1	2026-07-30 15:02:14.335
cms7n6ybn00evahjzqxy9c2af	cms7n6ybm00etahjzurz0v6rm	cms7n6ybk00esahjzkr2lbj72	2026-07-30 15:02:14.339
cms7n6ybr00f1ahjzwzfxnex0	cms7n6ybq00ezahjzr2v8niak	cms7n6ybp00eyahjzsc7cg64e	2026-07-30 15:02:14.344
cms7n6yby00f7ahjzv493ntqu	cms7n6ybv00f5ahjz8lcz0ilr	cms7n6ybt00f4ahjzdqitw91y	2026-07-30 15:02:14.35
cms7n6yc800fdahjzvnv1ubzh	cms7n6yc600fbahjz4od92qx5	cms7n6yc200faahjz55jqqqn8	2026-07-30 15:02:14.361
cms7n6ych00fjahjzhutcxwxm	cms7n6ycf00fhahjzs2y3iuwj	cms7n6ycc00fgahjzagac094d	2026-07-30 15:02:14.369
cms7n6ycq00fpahjz2cx5dmwf	cms7n6ycp00fnahjzqwr2lr3o	cms7n6ycm00fmahjzcdjxj8kj	2026-07-30 15:02:14.378
cms7n6ycv00fvahjzqpasr0i8	cms7n6ycu00ftahjz01y5evqg	cms7n6ycs00fsahjz73wnyhf3	2026-07-30 15:02:14.384
cms7n6yd100g1ahjzk65v1smz	cms7n6yd000fzahjz8pwk5nzq	cms7n6ycy00fyahjzaqdvk5fl	2026-07-30 15:02:14.39
cms7n6yda00g7ahjzthxwv2qt	cms7n6yd700g5ahjzwlrhaozd	cms7n6yd600g4ahjz8c19mjnw	2026-07-30 15:02:14.399
cms7n6ydn00gdahjzvd168ju7	cms7n6ydl00gbahjz5797nkcj	cms7n6ydh00gaahjz1t47ak0h	2026-07-30 15:02:14.411
cms7n6ydv00gjahjztf214p8f	cms7n6ydt00ghahjz0jj4jple	cms7n6ydr00ggahjzkaixq117	2026-07-30 15:02:14.419
cms7n6ye000gpahjzp9p42k1i	cms7n6ydz00gnahjz5tmeodib	cms7n6ydy00gmahjzym4wfgxz	2026-07-30 15:02:14.424
cms7n6ye300gvahjzi2e7zshn	cms7n6ye300gtahjzvfnxzcpz	cms7n6ye100gsahjz864gcmyk	2026-07-30 15:02:14.428
cms7n6yei00h7ahjzajzov7nh	cms7n6yeg00h5ahjztkkl64i4	cms7n6yee00h4ahjzkj7ndgrn	2026-07-30 15:02:14.442
cms7n6yeq00hdahjzxwer547o	cms7n6yep00hbahjz9q3cl52j	cms7n6yem00haahjzn8d1oys0	2026-07-30 15:02:14.451
cms7n6yey00hjahjzcbv3uwkj	cms7n6yex00hhahjzy4990f15	cms7n6yev00hgahjzi1ef8dii	2026-07-30 15:02:14.459
cms7n6yf400hpahjzu1grup0t	cms7n6yf200hnahjzbs130div	cms7n6yf100hmahjzorg904hm	2026-07-30 15:02:14.464
cms7n6yfa00hvahjzr9btzu2a	cms7n6yfa00htahjzm4xow631	cms7n6yf800hsahjzj0nbxdun	2026-07-30 15:02:14.471
cms7n6yff00i1ahjzodfnj2wo	cms7n6yfe00hzahjzpetllt32	cms7n6yfd00hyahjzvqx952k9	2026-07-30 15:02:14.475
cms7n6yfj00i7ahjz9iloipcp	cms7n6yfi00i5ahjz3ljqwyhd	cms7n6yfh00i4ahjzcf4xqdn8	2026-07-30 15:02:14.479
cms7n6yfp00idahjzxugh2ld7	cms7n6yfo00ibahjz8f2k89oi	cms7n6yfm00iaahjzp8bl69mk	2026-07-30 15:02:14.486
cms7n6yfz00ijahjzzrzy6j0q	cms7n6yfv00ihahjz4zig87s5	cms7n6yft00igahjzbcoo4nd6	2026-07-30 15:02:14.495
cms7n6yg900ipahjzc4ukwnuc	cms7n6yg800inahjzpcb2n13k	cms7n6yg600imahjz9pjc1kgw	2026-07-30 15:02:14.506
cms7n6ygg00ivahjzci7sbmnx	cms7n6ygf00itahjzu78fetu1	cms7n6ygd00isahjzsvqjeofl	2026-07-30 15:02:14.512
cms7n6ygk00izahjz6zdzojyb	cms7n6ygj00ixahjzaxwqonyl	cms7n6ygi00iwahjzxu9v0t77	2026-07-30 15:02:14.517
cms7n6ygo00j5ahjzpirfbv6p	cms7n6ygo00j3ahjz5a5x9ray	cms7n6ygm00j2ahjzzd3cpxtk	2026-07-30 15:02:14.521
cms7n6ygt00jbahjzc00gqu2p	cms7n6ygs00j9ahjz9swc8nij	cms7n6ygq00j8ahjzofs4vyuh	2026-07-30 15:02:14.525
cms7n6ygx00jhahjz4ila9jlf	cms7n6ygx00jfahjzgcr7mmz0	cms7n6ygw00jeahjz0uvuv3ui	2026-07-30 15:02:14.53
cms7n6yh600jnahjzbfgf610o	cms7n6yh300jlahjzmnk0n3vb	cms7n6yh100jkahjzslj16cl0	2026-07-30 15:02:14.538
cms7n6yhk00jtahjzxkmaioa0	cms7n6yhh00jrahjzvro8o40h	cms7n6yhd00jqahjza3r5lmnl	2026-07-30 15:02:14.552
cms7n6yhr00jzahjzehns0du7	cms7n6yhq00jxahjz52qfu1o1	cms7n6yhn00jwahjzeiwg0ky2	2026-07-30 15:02:14.559
cms7n6yhv00k5ahjzlt0xhpb9	cms7n6yhu00k3ahjzk1p9tdjp	cms7n6yht00k2ahjz4z572l36	2026-07-30 15:02:14.564
cms7n6yi000kbahjzuhox6qto	cms7n6yhz00k9ahjzecle7lnx	cms7n6yhy00k8ahjz90h89mk8	2026-07-30 15:02:14.568
cms7n6yi700khahjzhr8okg6t	cms7n6yi600kfahjzi7bema45	cms7n6yi300keahjzxtmdr87w	2026-07-30 15:02:14.576
cms7n6yii00knahjztrd6r0lp	cms7n6yif00klahjzmjd2rjrx	cms7n6yib00kkahjzc5003dsf	2026-07-30 15:02:14.586
cms7n6yix00ktahjz9560g2dh	cms7n6yiv00krahjz99o7mhla	cms7n6yis00kqahjzbzsm2c80	2026-07-30 15:02:14.601
cms7n6yj500kzahjzqrvrvstd	cms7n6yj400kxahjz0k97684a	cms7n6yj200kwahjzam9bo7lg	2026-07-30 15:02:14.61
cms7n6yjc00l5ahjzg8wrxxj9	cms7n6yja00l3ahjz57l3or0i	cms7n6yj800l2ahjzsc54j345	2026-07-30 15:02:14.616
cms7n6yjk00lbahjzw91pju0p	cms7n6yji00l9ahjzw8a1vcxq	cms7n6yjg00l8ahjz66ua6jv2	2026-07-30 15:02:14.624
cms7n6yjy00lhahjzdgwqczfh	cms7n6yju00lfahjz4tl9u4bz	cms7n6yjp00leahjz0z2w5cgu	2026-07-30 15:02:14.639
cms7n6y5b00a9ahjz8obybh92	cms7n6y5900a7ahjzcr1agep5	cms7n6y5700a6ahjzb7yb02kk	2026-07-30 15:02:14.111
cms7n6y8m00c7ahjzx4i0u0ht	cms7n6y8j00c5ahjzj6f4rbjv	cms7n6y8g00c4ahjzzsq05tdo	2026-07-30 15:02:14.23
cms7n6ye900h1ahjzhsaiwagz	cms7n6ye700gzahjz0s313gp7	cms7n6ye500gyahjz7fs0u46p	2026-07-30 15:02:14.433
cms7n6ykd00llahjzf648eqf0	cms7n6yka00ljahjz89le7zib	cms7n6yk500liahjzncpguc0s	2026-07-30 15:02:14.654
cms7n6ykj00lpahjzruz163nx	cms7n6ykh00lnahjzt4cyausw	cms7n6ykg00lmahjzbrodlne4	2026-07-30 15:02:14.659
cms7n6ykp00lvahjzogpvg4kj	cms7n6ykn00ltahjz22ule3bc	cms7n6ykl00lsahjzx8a8wazy	2026-07-30 15:02:14.665
cms7n6ykz00m1ahjzlggk4phe	cms7n6ykw00lzahjzywh2n4ks	cms7n6yku00lyahjzx6wymen3	2026-07-30 15:02:14.675
cms7n6ylk00m7ahjza6n2uvvk	cms7n6ylg00m5ahjzrebcpg36	cms7n6yl700m4ahjzcqkt2smg	2026-07-30 15:02:14.697
cms7n6yls00mdahjz9f2a5su3	cms7n6ylq00mbahjzosotv9a8	cms7n6ylp00maahjzi45o6zq7	2026-07-30 15:02:14.704
cms7n6ylz00mjahjz4w3xtmz7	cms7n6ylx00mhahjzf8mg1o5u	cms7n6ylu00mgahjz84u2nnuz	2026-07-30 15:02:14.711
cms7n6yma00mpahjze1bcjpng	cms7n6ym600mnahjz6xquzyq8	cms7n6ym400mmahjzg88tim8h	2026-07-30 15:02:14.722
cms7n6ymp00mvahjz4dcm2v6b	cms7n6ymn00mtahjzmgdev0kz	cms7n6ymk00msahjzqylpvcgc	2026-07-30 15:02:14.738
cms7n6ymw00n1ahjzh3o0czqn	cms7n6ymv00mzahjzev90pr35	cms7n6ymt00myahjzu2xj1w61	2026-07-30 15:02:14.744
cms7n6yn300n7ahjzx8jh2q4e	cms7n6yn100n5ahjzn1z5ocnb	cms7n6ymz00n4ahjz9ks0um88	2026-07-30 15:02:14.751
cms7n6yn900ndahjzsvr70i0l	cms7n6yn800nbahjzc9h31u5u	cms7n6yn600naahjzm7tedyia	2026-07-30 15:02:14.758
cms7n6yng00njahjz1lygzsit	cms7n6yne00nhahjz6tt0j9z8	cms7n6ync00ngahjzszhlfe9j	2026-07-30 15:02:14.764
cms7n6ynr00nnahjzsyrjz13m	cms7n6ynn00nlahjzfouh1ap9	cms7n6ynj00nkahjzj3mchf9t	2026-07-30 15:02:14.776
cms7n6yo600ntahjz7vx01cob	cms7n6yo400nrahjz2lxsukr3	cms7n6yo000nqahjzqfsk9oh7	2026-07-30 15:02:14.79
cms7n6yob00nxahjzj6xu3irh	cms7n6yoa00nvahjz6ulaptsh	cms7n6yo800nuahjzpjh98358	2026-07-30 15:02:14.795
cms7n6yoi00o3ahjz1300r1a0	cms7n6yog00o1ahjzjoyyf0tn	cms7n6yod00o0ahjzok895vp1	2026-07-30 15:02:14.802
cms7n6yoo00o9ahjza0z94cfw	cms7n6yom00o7ahjzj2uj3kp3	cms7n6yol00o6ahjzxkfkbfeb	2026-07-30 15:02:14.808
cms7n6yow00odahjzne8hqwn8	cms7n6yot00obahjzm6bch6ib	cms7n6yor00oaahjzs6gqqdl4	2026-07-30 15:02:14.817
cms7n6yp900ojahjzqqtdslca	cms7n6yp700ohahjzjojfg4bk	cms7n6yp400ogahjzpmbckmox	2026-07-30 15:02:14.829
cms7n6ypi00opahjzd2yktayf	cms7n6ypg00onahjzlec6l7a1	cms7n6ypf00omahjz1fa9fe37	2026-07-30 15:02:14.838
cms7n6ypn00ovahjzz8dzgtsq	cms7n6ypm00otahjzjputxa1l	cms7n6ypl00osahjzfmoyzmyi	2026-07-30 15:02:14.843
cms7n6ypu00p1ahjzehy21vjb	cms7n6ypr00ozahjzfx7tv12e	cms7n6ypp00oyahjzfjfrchdt	2026-07-30 15:02:14.85
cms7n6yq100p7ahjzl1eg2wa5	cms7n6ypz00p5ahjz9xcnz9m0	cms7n6ypx00p4ahjzfkwono35	2026-07-30 15:02:14.858
cms7n6yqf00pdahjzavnb1b9k	cms7n6yqc00pbahjz89vxbx39	cms7n6yq900paahjzirqktxdc	2026-07-30 15:02:14.871
cms7n6yqn00pjahjza9jgyhfd	cms7n6yqm00phahjzwfvlcc2z	cms7n6yqi00pgahjzb39o1z3s	2026-07-30 15:02:14.879
cms7n6yqs00pnahjzbul9ckpm	cms7n6yqr00plahjz1pfxr82r	cms7n6yqp00pkahjzjnj6hd0o	2026-07-30 15:02:14.884
cms7n6yqw00ptahjzhfrq0bum	cms7n6yqv00prahjzkaeqjd3y	cms7n6yqu00pqahjz3dqs9qd2	2026-07-30 15:02:14.889
cms7n6yr300pzahjz2jfeygay	cms7n6yr100pxahjz5wo27muq	cms7n6yqz00pwahjzq9xkjial	2026-07-30 15:02:14.896
cms7n6yrd00q5ahjz41wdt0e2	cms7n6yrb00q3ahjzicw1q86l	cms7n6yr800q2ahjz7lwudkyl	2026-07-30 15:02:14.906
cms7n6yrq00qbahjzy5ccwyaa	cms7n6yro00q9ahjzz3gkflob	cms7n6yrj00q8ahjza1p1d8yh	2026-07-30 15:02:14.919
cms7n6yry00qhahjzh1xxldxf	cms7n6yrw00qfahjzzd0i4ase	cms7n6yrt00qeahjzjtgfko0d	2026-07-30 15:02:14.927
cms7n6ys300qnahjzfupkke0o	cms7n6ys200qlahjz1lvspbol	cms7n6ys000qkahjzcssfy2q9	2026-07-30 15:02:14.931
cms7n6ys800qtahjzd1bc14j0	cms7n6ys700qrahjzdm163l4k	cms7n6ys500qqahjz85v6hqv5	2026-07-30 15:02:14.936
cms7n6ysc00qxahjz04sbly02	cms7n6ysc00qvahjz27i7g536	cms7n6ysa00quahjzlh12n5iw	2026-07-30 15:02:14.941
cms7n6ysg00r1ahjzqt0a1unz	cms7n6ysf00qzahjzkcf28pyu	cms7n6yse00qyahjzvxhp0ynd	2026-07-30 15:02:14.945
cms7n6ysm00r5ahjzxmp76dyp	cms7n6ysk00r3ahjznx1t0kbt	cms7n6ysi00r2ahjz0fqitwmq	2026-07-30 15:02:14.951
cms7n6ysx00r9ahjzzk79dfu9	cms7n6ysu00r7ahjz5pmgdmka	cms7n6ysr00r6ahjzrm57zwnj	2026-07-30 15:02:14.961
cms7n6yt600rdahjz9ra2qyp2	cms7n6yt400rbahjzdz8p8od4	cms7n6yt100raahjz0nrbt3ye	2026-07-30 15:02:14.97
cms7n6ytb00rhahjzchmcjfo8	cms7n6yta00rfahjz0sufdi0x	cms7n6yt800reahjzh6dgk39u	2026-07-30 15:02:14.976
\.


--
-- Data for Name: OrganizationFee; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."OrganizationFee" (id, "organizationId", channel, "feePercent", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: QrCode; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."QrCode" (id, "organizationId", "targetUrl", "imageDataUrl", "isActive", "createdAt", "revokedAt") FROM stdin;
\.


--
-- Data for Name: RecurringDonation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RecurringDonation" (id, "organizationId", "donorId", amount, "dayOfMonth", status, "providerContractId", "startedAt", "cancelledAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Session" (id, "sessionToken", "userId", expires) FROM stdin;
\.


--
-- Data for Name: Settlement; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Settlement" (id, "organizationId", period, "scheduledDate", "totalAmount", "feeAmount", "netAmount", status, "processedAt", "bankName", "bankAccount", "bankHolder", note, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SettlementItem; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SettlementItem" (id, "settlementId", "donationId", amount, channel, "donatedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: SmsNumberAssignment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SmsNumberAssignment" (id, "organizationId", "baseNumber", code, "fullNumber", "assignedById", "isActive", "assignedAt", "revokedAt") FROM stdin;
cms7n6xhj000lahjz6lit3k69	cms7n6xhd000gahjzxbpl9dgz	#2540	4712	#2540-4712	\N	t	2026-07-30 15:02:13.255	\N
cms7n6xhq000rahjz8n4wpzcm	cms7n6xhm000mahjzatvcpk2u	#2540	4711	#2540-4711	\N	t	2026-07-30 15:02:13.263	\N
cms7n6xi1000xahjz9st176cl	cms7n6xhu000sahjzbauwroe5	#2540	4710	#2540-4710	\N	t	2026-07-30 15:02:13.273	\N
cms7n6xig0013ahjzxtozhdh0	cms7n6xi5000yahjzsqprsx2k	#2540	4709	#2540-4709	\N	t	2026-07-30 15:02:13.288	\N
cms7n6xin0019ahjz6ovme232	cms7n6xij0014ahjzwnof1dmd	#2540	4708	#2540-4708	\N	t	2026-07-30 15:02:13.296	\N
cms7n6xiw001fahjzwzizmkj7	cms7n6xiq001aahjz5oj04707	#2540	4707	#2540-4707	\N	t	2026-07-30 15:02:13.304	\N
cms7n6xj1001lahjza8zcte8d	cms7n6xiy001gahjzma0pox2u	#2540	4706	#2540-4706	\N	t	2026-07-30 15:02:13.31	\N
cms7n6xjb001rahjzeus1jgxc	cms7n6xj3001mahjzz5pk3aup	#2540	4705	#2540-4705	\N	t	2026-07-30 15:02:13.32	\N
cms7n6xjp001xahjzi9wd1d3l	cms7n6xjf001sahjzx3qczmmh	#2540	4704	#2540-4704	\N	t	2026-07-30 15:02:13.333	\N
cms7n6xk00023ahjz5gec28y6	cms7n6xjt001yahjz36e7khne	#2540	4703	#2540-4703	\N	t	2026-07-30 15:02:13.344	\N
cms7n6xk70029ahjzj6ucv53u	cms7n6xk30024ahjzwwyp1obe	#2540	4702	#2540-4702	\N	t	2026-07-30 15:02:13.351	\N
cms7n6xkc002fahjzoqymuhsj	cms7n6xk8002aahjzijrhxlus	#2540	4701	#2540-4701	\N	t	2026-07-30 15:02:13.356	\N
cms7n6xkh002lahjz0e1s4ncu	cms7n6xkd002gahjzfzbjt8ay	#2540	4700	#2540-4700	\N	t	2026-07-30 15:02:13.362	\N
cms7n6xkn002rahjzl3hnzfzi	cms7n6xkj002mahjzeuy6b7ey	#2540	4699	#2540-4699	\N	t	2026-07-30 15:02:13.367	\N
cms7n6xkx002xahjzdeh9opth	cms7n6xko002sahjzykqxm32c	#2540	4698	#2540-4698	\N	t	2026-07-30 15:02:13.377	\N
cms7n6xld0033ahjz8g6qkgqc	cms7n6xl2002yahjz3f7ie9ay	#2540	4697	#2540-4697	\N	t	2026-07-30 15:02:13.393	\N
cms7n6xlm0039ahjzzjdq4l2s	cms7n6xlg0034ahjztu96294e	#2540	4696	#2540-4696	\N	t	2026-07-30 15:02:13.402	\N
cms7n6xlt003fahjzsnk9zch6	cms7n6xlo003aahjzleavghyi	#2540	4695	#2540-4695	\N	t	2026-07-30 15:02:13.41	\N
cms7n6xlz003lahjzcogoqpgd	cms7n6xlv003gahjz3znttl82	#2540	4694	#2540-4694	\N	t	2026-07-30 15:02:13.416	\N
cms7n6xmb003rahjzjflmf78i	cms7n6xm1003mahjz90hnuhia	#2540	4693	#2540-4693	\N	t	2026-07-30 15:02:13.428	\N
cms7n6xmq003xahjz4ivgrmw9	cms7n6xmi003sahjz0w1qn4wp	#2540	4692	#2540-4692	\N	t	2026-07-30 15:02:13.443	\N
cms7n6xmy0043ahjzul8c4a7d	cms7n6xmt003yahjzdqp9jins	#2540	4691	#2540-4691	\N	t	2026-07-30 15:02:13.45	\N
cms7n6xn70049ahjzm99ha16o	cms7n6xn00044ahjztcyg21oh	#2540	4690	#2540-4690	\N	t	2026-07-30 15:02:13.459	\N
cms7n6xoh004fahjzibr27g07	cms7n6xn9004aahjz5nys0ib8	#2540	4689	#2540-4689	\N	t	2026-07-30 15:02:13.506	\N
cms7n6xpe004lahjzcc591nwe	cms7n6xov004gahjzgr7am1rp	#2540	4688	#2540-4688	\N	t	2026-07-30 15:02:13.539	\N
cms7n6xqi004rahjz2cjimbcq	cms7n6xpk004mahjzn9ulz0o9	#2540	4687	#2540-4687	\N	t	2026-07-30 15:02:13.578	\N
cms7n6xr5004xahjz4c7xsm8k	cms7n6xqw004sahjzqyssk7jt	#2540	4686	#2540-4686	\N	t	2026-07-30 15:02:13.601	\N
cms7n6xrm0053ahjzeowb5ybw	cms7n6xrc004yahjzpyhhxv6z	#2540	4685	#2540-4685	\N	t	2026-07-30 15:02:13.619	\N
cms7n6xrz0059ahjzwadeem2o	cms7n6xrt0054ahjz1g9xm50u	#2540	6550	#2540-6550	\N	t	2026-07-30 15:02:13.631	\N
cms7n6xsf005fahjzx3wz20gz	cms7n6xs5005aahjz9wryu7hj	#2540	4684	#2540-4684	\N	t	2026-07-30 15:02:13.648	\N
cms7n6xsv005lahjzx9kjca0p	cms7n6xsn005gahjzlvuggg6b	#2540	4683	#2540-4683	\N	t	2026-07-30 15:02:13.663	\N
cms7n6xt5005rahjz1omnlhdn	cms7n6xt0005mahjzpuylym74	#2540	4682	#2540-4682	\N	t	2026-07-30 15:02:13.673	\N
cms7n6xu7005xahjzhjvx02l3	cms7n6xtc005sahjz7ydefowb	#2540	4681	#2540-4681	\N	t	2026-07-30 15:02:13.712	\N
cms7n6xv70063ahjzjbep1xc0	cms7n6xup005yahjzpefmzzx1	#2540	4680	#2540-4680	\N	t	2026-07-30 15:02:13.747	\N
cms7n6xvs0069ahjze0xetbfy	cms7n6xvi0064ahjzab2is672	#2540	4160	#2540-4160	\N	t	2026-07-30 15:02:13.768	\N
cms7n6xwn006fahjznyy9vtn8	cms7n6xw0006aahjz5d12ap6u	#2540	4679	#2540-4679	\N	t	2026-07-30 15:02:13.8	\N
cms7n6xxi006lahjz8wm86w6c	cms7n6xx8006gahjzafig0sq1	#2540	4678	#2540-4678	\N	t	2026-07-30 15:02:13.83	\N
cms7n6xxz006rahjzo6jh925e	cms7n6xxs006mahjzbusrjpih	#2540	4677	#2540-4677	\N	t	2026-07-30 15:02:13.847	\N
cms7n6xya006xahjzkqjy1zxl	cms7n6xy6006sahjzqpbi6883	#2540	4676	#2540-4676	\N	t	2026-07-30 15:02:13.858	\N
cms7n6xyi0073ahjz85qmic9j	cms7n6xyb006yahjz201klog2	#2540	4675	#2540-4675	\N	t	2026-07-30 15:02:13.867	\N
cms7n6xzb0079ahjzsaiciamh	cms7n6xyl0074ahjzq75ozbj7	#2540	4674	#2540-4674	\N	t	2026-07-30 15:02:13.896	\N
cms7n6y00007fahjzd68axexp	cms7n6xzk007aahjzb3jeys9k	#2540	4673	#2540-4673	\N	t	2026-07-30 15:02:13.92	\N
cms7n6y0x007lahjzycdh68k5	cms7n6y0i007gahjzs4gnhogt	#2540	4672	#2540-4672	\N	t	2026-07-30 15:02:13.953	\N
cms7n6y1d007rahjz61m7dzoo	cms7n6y11007mahjz6ksi58md	#2540	4671	#2540-4671	\N	t	2026-07-30 15:02:13.969	\N
cms7n6y1l007xahjzcfv62cnm	cms7n6y1g007sahjz8su4rnsi	#2540	4670	#2540-4670	\N	t	2026-07-30 15:02:13.977	\N
cms7n6y1r0083ahjzrp7co3yo	cms7n6y1m007yahjzh7qg434x	#2540	4669	#2540-4669	\N	t	2026-07-30 15:02:13.984	\N
cms7n6y250089ahjzopr9q5b8	cms7n6y1v0084ahjzglcwm5js	#2540	4668	#2540-4668	\N	t	2026-07-30 15:02:13.998	\N
cms7n6y2f008fahjzf2oplmfx	cms7n6y28008aahjznd8v1fhv	#2540	4667	#2540-4667	\N	t	2026-07-30 15:02:14.007	\N
cms7n6y2l008lahjzxs1q6f5j	cms7n6y2h008gahjz089c1blx	#2540	4666	#2540-4666	\N	t	2026-07-30 15:02:14.014	\N
cms7n6y2q008rahjzna4ttmb5	cms7n6y2o008mahjzv1yq8b29	#2540	4665	#2540-4665	\N	t	2026-07-30 15:02:14.019	\N
cms7n6y380091ahjzpo3iufil	cms7n6y2z008wahjzmy2u8x59	#2540	4663	#2540-4663	\N	t	2026-07-30 15:02:14.037	\N
cms7n6y3l0097ahjzft7krpwf	cms7n6y3b0092ahjz0olnvn4a	#2540	4662	#2540-4662	\N	t	2026-07-30 15:02:14.049	\N
cms7n6y3u009dahjzjobiblvl	cms7n6y3o0098ahjzoynii4gc	#2540	9650	#2540-9650	\N	t	2026-07-30 15:02:14.058	\N
cms7n6y41009jahjz3xraswo3	cms7n6y3w009eahjz7jkre4fl	#2540	4661	#2540-4661	\N	t	2026-07-30 15:02:14.065	\N
cms7n6y4m009tahjzijyu9ait	cms7n6y4c009oahjz25xap4i3	#2540	4659	#2540-4659	\N	t	2026-07-30 15:02:14.087	\N
cms7n6y4y009zahjzt5reke1p	cms7n6y4p009uahjzle6atcp4	#2540	4658	#2540-4658	\N	t	2026-07-30 15:02:14.099	\N
cms7n6y5500a5ahjzr8y8nuay	cms7n6y5200a0ahjzgk2dht6s	#2540	4657	#2540-4657	\N	t	2026-07-30 15:02:14.106	\N
cms7n6y5f00abahjzr9k39xie	cms7n6y5700a6ahjzb7yb02kk	#2540	4656	#2540-4656	\N	t	2026-07-30 15:02:14.115	\N
cms7n6y5p00ahahjzgo6btym5	cms7n6y5i00acahjztwbtx39e	#2540	4655	#2540-4655	\N	t	2026-07-30 15:02:14.126	\N
cms7n6y6400anahjz5qlg6fqx	cms7n6y5y00aiahjzqvdnmxbz	#2540	4654	#2540-4654	\N	t	2026-07-30 15:02:14.14	\N
cms7n6y6b00atahjzjwyj8je0	cms7n6y6700aoahjzl1halv3s	#2540	4653	#2540-4653	\N	t	2026-07-30 15:02:14.148	\N
cms7n6y6g00azahjzj9q7qa8t	cms7n6y6d00auahjzxioikjj3	#2540	4652	#2540-4652	\N	t	2026-07-30 15:02:14.153	\N
cms7n6y6o00b5ahjzr486spqy	cms7n6y6i00b0ahjzsjiwaal9	#2540	4651	#2540-4651	\N	t	2026-07-30 15:02:14.16	\N
cms7n6y7000bbahjzs6iufs4l	cms7n6y6r00b6ahjzk4j3aai5	#2540	4650	#2540-4650	\N	t	2026-07-30 15:02:14.172	\N
cms7n6y7t00btahjzoucy61wa	cms7n6y7o00boahjzzqurfh87	#2540	3000	#2540-3000	\N	t	2026-07-30 15:02:14.202	\N
cms7n6y8300bzahjzgpjubf9p	cms7n6y7w00buahjzc19l1g36	#2540	7006	#2540-7006	\N	t	2026-07-30 15:02:14.211	\N
cms7n6y8o00c9ahjztfvf5vpc	cms7n6y8g00c4ahjzzsq05tdo	#2540	1066	#2540-1066	\N	t	2026-07-30 15:02:14.232	\N
cms7n6y8v00cfahjzs7udes0i	cms7n6y8q00caahjzm78h1177	#2540	4242	#2540-4242	\N	t	2026-07-30 15:02:14.239	\N
cms7n6y9000clahjzljqic1sm	cms7n6y8w00cgahjzuwtsa1wt	#2540	7575	#2540-7575	\N	t	2026-07-30 15:02:14.244	\N
cms7n6y9600crahjzy3o1lplf	cms7n6y9100cmahjz0yzgvv1y	#2540	7306	#2540-7306	\N	t	2026-07-30 15:02:14.251	\N
cms7n6y9b00cxahjzuj1uenw0	cms7n6y9800csahjzegpnrv6l	#2540	0383	#2540-0383	\N	t	2026-07-30 15:02:14.256	\N
cms7n6y9g00d3ahjzhq8xcng4	cms7n6y9d00cyahjzkxyhgaij	#2540	7979	#2540-7979	\N	t	2026-07-30 15:02:14.26	\N
cms7n6y9p00d9ahjztmtumw7s	cms7n6y9i00d4ahjztijnrup6	#2540	0904	#2540-0904	\N	t	2026-07-30 15:02:14.269	\N
cms7n6ya100dfahjzqymsd8qk	cms7n6y9s00daahjzf34gqufp	#2540	3355	#2540-3355	\N	t	2026-07-30 15:02:14.282	\N
cms7n6ya900dlahjz65g6fr0n	cms7n6ya400dgahjzf5dhsfi4	#2540	2560	#2540-2560	\N	t	2026-07-30 15:02:14.289	\N
cms7n6yae00drahjz9lyw38e6	cms7n6yab00dmahjzw3fx4iiv	#2540	3161	#2540-3161	\N	t	2026-07-30 15:02:14.294	\N
cms7n6yaj00dxahjz69vcnalx	cms7n6yaf00dsahjzvquyvtxt	#2540	3162	#2540-3162	\N	t	2026-07-30 15:02:14.299	\N
cms7n6yao00e3ahjzf8v7zswh	cms7n6yak00dyahjz0ukknkyy	#2540	0136	#2540-0136	\N	t	2026-07-30 15:02:14.304	\N
cms7n6yax00e9ahjzadrtryj1	cms7n6yaq00e4ahjzk7ccj2g5	#2540	3396	#2540-3396	\N	t	2026-07-30 15:02:14.313	\N
cms7n6yb700efahjzrsv1pfkh	cms7n6yb100eaahjznspv6jdp	#2540	2848	#2540-2848	\N	t	2026-07-30 15:02:14.323	\N
cms7n6ybd00elahjzqjx4pl3j	cms7n6yb900egahjznwv9do9j	#2540	0909	#2540-0909	\N	t	2026-07-30 15:02:14.33	\N
cms7n6ybj00erahjzdp5o3wlo	cms7n6ybg00emahjzchl63xx1	#2540	1992	#2540-1992	\N	t	2026-07-30 15:02:14.335	\N
cms7n6ybo00exahjz2r46xv06	cms7n6ybk00esahjzkr2lbj72	#2540	7640	#2540-7640	\N	t	2026-07-30 15:02:14.34	\N
cms7n6ybs00f3ahjzohehsxi5	cms7n6ybp00eyahjzsc7cg64e	#2540	0911	#2540-0911	\N	t	2026-07-30 15:02:14.344	\N
cms7n6ybz00f9ahjz59gb4wzg	cms7n6ybt00f4ahjzdqitw91y	#2540	4362	#2540-4362	\N	t	2026-07-30 15:02:14.352	\N
cms7n6yca00ffahjzw2stt8fs	cms7n6yc200faahjz55jqqqn8	#2540	1313	#2540-1313	\N	t	2026-07-30 15:02:14.362	\N
cms7n6ycj00flahjzplc2o3my	cms7n6ycc00fgahjzagac094d	#2540	0427	#2540-0427	\N	t	2026-07-30 15:02:14.371	\N
cms7n6ycr00frahjz6wpa2bm6	cms7n6ycm00fmahjzcdjxj8kj	#2540	1000	#2540-1000	\N	t	2026-07-30 15:02:14.379	\N
cms7n6ycw00fxahjz7hhxx0x7	cms7n6ycs00fsahjz73wnyhf3	#2540	0613	#2540-0613	\N	t	2026-07-30 15:02:14.385	\N
cms7n6yd300g3ahjzps0hf991	cms7n6ycy00fyahjzaqdvk5fl	#2540	1366	#2540-1366	\N	t	2026-07-30 15:02:14.392	\N
cms7n6ydd00g9ahjzacuygb7t	cms7n6yd600g4ahjz8c19mjnw	#2540	9420	#2540-9420	\N	t	2026-07-30 15:02:14.402	\N
cms7n6ydp00gfahjzoc0taxsw	cms7n6ydh00gaahjz1t47ak0h	#2540	1515	#2540-1515	\N	t	2026-07-30 15:02:14.413	\N
cms7n6ydw00glahjz49574wn9	cms7n6ydr00ggahjzkaixq117	#2540	2030	#2540-2030	\N	t	2026-07-30 15:02:14.42	\N
cms7n6ye000grahjz5avfp3ea	cms7n6ydy00gmahjzym4wfgxz	#2540	0179	#2540-0179	\N	t	2026-07-30 15:02:14.425	\N
cms7n6ye400gxahjzdi0ii6j0	cms7n6ye100gsahjz864gcmyk	#2540	6279	#2540-6279	\N	t	2026-07-30 15:02:14.429	\N
cms7n6yec00h3ahjzh40e9sh1	cms7n6ye500gyahjz7fs0u46p	#2540	1122	#2540-1122	\N	t	2026-07-30 15:02:14.436	\N
cms7n6yek00h9ahjzyg2q512f	cms7n6yee00h4ahjzkj7ndgrn	#2540	9988	#2540-9988	\N	t	2026-07-30 15:02:14.444	\N
cms7n6yes00hfahjzx7pz4h1d	cms7n6yem00haahjzn8d1oys0	#2540	1101	#2540-1101	\N	t	2026-07-30 15:02:14.453	\N
cms7n6yez00hlahjzds5qejce	cms7n6yev00hgahjzi1ef8dii	#2540	010	#2540-010	\N	t	2026-07-30 15:02:14.46	\N
cms7n6yf700hrahjzs9uom3gr	cms7n6yf100hmahjzorg904hm	#2540	2540	#2540-2540	\N	t	2026-07-30 15:02:14.467	\N
cms7n6yfb00hxahjzpph3q24j	cms7n6yf800hsahjzj0nbxdun	#2540	2353	#2540-2353	\N	t	2026-07-30 15:02:14.472	\N
cms7n6yfg00i3ahjzvdevz0ij	cms7n6yfd00hyahjzvqx952k9	#2540	2	#2540-2	\N	t	2026-07-30 15:02:14.476	\N
cms7n6yfk00i9ahjzu0f2s7i9	cms7n6yfh00i4ahjzcf4xqdn8	#2540	5101	#2540-5101	\N	t	2026-07-30 15:02:14.48	\N
cms7n6yfr00ifahjzznml1jrm	cms7n6yfm00iaahjzp8bl69mk	#2540	7697	#2540-7697	\N	t	2026-07-30 15:02:14.487	\N
cms7n6yg200ilahjzqbyggjba	cms7n6yft00igahjzbcoo4nd6	#2540	1460	#2540-1460	\N	t	2026-07-30 15:02:14.499	\N
cms7n6ygb00irahjz50brap4p	cms7n6yg600imahjz9pjc1kgw	#2540	1004	#2540-1004	\N	t	2026-07-30 15:02:14.507	\N
cms7n6ygl00j1ahjz60ucjejg	cms7n6ygi00iwahjzxu9v0t77	#2540	1053	#2540-1053	\N	t	2026-07-30 15:02:14.517	\N
cms7n6ygp00j7ahjzspioz0gx	cms7n6ygm00j2ahjzzd3cpxtk	#2540	111	#2540-111	\N	t	2026-07-30 15:02:14.522	\N
cms7n6ygu00jdahjzbb5maaqv	cms7n6ygq00j8ahjzofs4vyuh	#2540	4000	#2540-4000	\N	t	2026-07-30 15:02:14.526	\N
cms7n6ygz00jjahjzlib8qdp4	cms7n6ygw00jeahjz0uvuv3ui	#2540	4201	#2540-4201	\N	t	2026-07-30 15:02:14.531	\N
cms7n6yh900jpahjzoouxlyzw	cms7n6yh100jkahjzslj16cl0	#2540	8080	#2540-8080	\N	t	2026-07-30 15:02:14.541	\N
cms7n6yhl00jvahjzv2ouf73l	cms7n6yhd00jqahjza3r5lmnl	#2540	1365	#2540-1365	\N	t	2026-07-30 15:02:14.554	\N
cms7n6yhs00k1ahjzszdxme5d	cms7n6yhn00jwahjzeiwg0ky2	#2540	7788	#2540-7788	\N	t	2026-07-30 15:02:14.56	\N
cms7n6yhw00k7ahjzqdomyuxq	cms7n6yht00k2ahjz4z572l36	#2540	7	#2540-7	\N	t	2026-07-30 15:02:14.565	\N
cms7n6yi100kdahjz2h50nxyz	cms7n6yhy00k8ahjz90h89mk8	#2540	7942	#2540-7942	\N	t	2026-07-30 15:02:14.569	\N
cms7n6yi900kjahjz32v2t3hl	cms7n6yi300keahjzxtmdr87w	#2540	1510	#2540-1510	\N	t	2026-07-30 15:02:14.577	\N
cms7n6yio00kpahjzk5pxbu2g	cms7n6yib00kkahjzc5003dsf	#2540	1391	#2540-1391	\N	t	2026-07-30 15:02:14.592	\N
cms7n6yj000kvahjzwd9u837a	cms7n6yis00kqahjzbzsm2c80	#2540	1011	#2540-1011	\N	t	2026-07-30 15:02:14.604	\N
cms7n6yj600l1ahjzmdmqt37g	cms7n6yj200kwahjzam9bo7lg	#2540	8600	#2540-8600	\N	t	2026-07-30 15:02:14.611	\N
cms7n6yjd00l7ahjzsu4p2zb8	cms7n6yj800l2ahjzsc54j345	#2540	9595	#2540-9595	\N	t	2026-07-30 15:02:14.617	\N
cms7n6yjn00ldahjzvmd4wmux	cms7n6yjg00l8ahjz66ua6jv2	#2540	5500	#2540-5500	\N	t	2026-07-30 15:02:14.627	\N
cms7n6ykk00lrahjzw32xu76p	cms7n6ykg00lmahjzbrodlne4	#2540	0700	#2540-0700	\N	t	2026-07-30 15:02:14.661	\N
cms7n6ykr00lxahjzitj7zoxl	cms7n6ykl00lsahjzx8a8wazy	#2540	8045	#2540-8045	\N	t	2026-07-30 15:02:14.668	\N
cms7n6yl200m3ahjz4ez2iv6n	cms7n6yku00lyahjzx6wymen3	#2540	2020	#2540-2020	\N	t	2026-07-30 15:02:14.678	\N
cms7n6yln00m9ahjz0bwadags	cms7n6yl700m4ahjzcqkt2smg	#2540	1265	#2540-1265	\N	t	2026-07-30 15:02:14.699	\N
cms7n6ylt00mfahjzv4jwmyzx	cms7n6ylp00maahjzi45o6zq7	#2540	5004	#2540-5004	\N	t	2026-07-30 15:02:14.705	\N
cms7n6ym000mlahjz95oz6b11	cms7n6ylu00mgahjz84u2nnuz	#2540	1027	#2540-1027	\N	t	2026-07-30 15:02:14.713	\N
cms7n6ymf00mrahjzqot8e80z	cms7n6ym400mmahjzg88tim8h	#2540	7777	#2540-7777	\N	t	2026-07-30 15:02:14.727	\N
cms7n6ymr00mxahjzyx503pkq	cms7n6ymk00msahjzqylpvcgc	#2540	0881	#2540-0881	\N	t	2026-07-30 15:02:14.74	\N
cms7n6ymx00n3ahjz01klur9n	cms7n6ymt00myahjzu2xj1w61	#2540	8	#2540-8	\N	t	2026-07-30 15:02:14.745	\N
cms7n6yn400n9ahjzat52fq6y	cms7n6ymz00n4ahjz9ks0um88	#2540	1991	#2540-1991	\N	t	2026-07-30 15:02:14.753	\N
cms7n6ynb00nfahjznrxdyp6j	cms7n6yn600naahjzm7tedyia	#2540	7415	#2540-7415	\N	t	2026-07-30 15:02:14.759	\N
cms7n6ynv00npahjzt1vin9vp	cms7n6ynj00nkahjzj3mchf9t	#2540	1998	#2540-1998	\N	t	2026-07-30 15:02:14.779	\N
cms7n6yob00nzahjzhrf0qh6j	cms7n6yo800nuahjzpjh98358	#2540	0308	#2540-0308	\N	t	2026-07-30 15:02:14.796	\N
cms7n6yoj00o5ahjzy0koeptg	cms7n6yod00o0ahjzok895vp1	#2540	6484	#2540-6484	\N	t	2026-07-30 15:02:14.804	\N
cms7n6yp100ofahjzv3iwlq3o	cms7n6yor00oaahjzs6gqqdl4	#2540	5353	#2540-5353	\N	t	2026-07-30 15:02:14.821	\N
cms7n6ypd00olahjz55tty1h0	cms7n6yp400ogahjzpmbckmox	#2540	1994	#2540-1994	\N	t	2026-07-30 15:02:14.834	\N
cms7n6ypj00orahjzolb91dvc	cms7n6ypf00omahjz1fa9fe37	#2540	0923	#2540-0923	\N	t	2026-07-30 15:02:14.839	\N
cms7n6ypo00oxahjzkuynkwza	cms7n6ypl00osahjzfmoyzmyi	#2540	0442	#2540-0442	\N	t	2026-07-30 15:02:14.844	\N
cms7n6ypw00p3ahjz48c5ol6b	cms7n6ypp00oyahjzfjfrchdt	#2540	1999	#2540-1999	\N	t	2026-07-30 15:02:14.852	\N
cms7n6yq300p9ahjzfhax468m	cms7n6ypx00p4ahjzfkwono35	#2540	9964	#2540-9964	\N	t	2026-07-30 15:02:14.86	\N
cms7n6yqg00pfahjz6a6mqq2v	cms7n6yq900paahjzirqktxdc	#2540	0318	#2540-0318	\N	t	2026-07-30 15:02:14.873	\N
cms7n6yqt00ppahjzhwbwirj7	cms7n6yqp00pkahjzjnj6hd0o	#2540	2011	#2540-2011	\N	t	2026-07-30 15:02:14.885	\N
cms7n6yqx00pvahjzrhahh201	cms7n6yqu00pqahjz3dqs9qd2	#2540	1001	#2540-1001	\N	t	2026-07-30 15:02:14.89	\N
cms7n6yr600q1ahjzuv3yxuyg	cms7n6yqz00pwahjzq9xkjial	#2540	3838	#2540-3838	\N	t	2026-07-30 15:02:14.898	\N
cms7n6yrh00q7ahjz7ug25fqz	cms7n6yr800q2ahjz7lwudkyl	#2540	1983	#2540-1983	\N	t	2026-07-30 15:02:14.909	\N
cms7n6yrs00qdahjz6m0evgcs	cms7n6yrj00q8ahjza1p1d8yh	#2540	3412	#2540-3412	\N	t	2026-07-30 15:02:14.92	\N
cms7n6yrz00qjahjzeptb60y2	cms7n6yrt00qeahjzjtgfko0d	#2540	1989	#2540-1989	\N	t	2026-07-30 15:02:14.928	\N
cms7n6ys400qpahjzl6pggqsw	cms7n6ys000qkahjzcssfy2q9	#2540	9300	#2540-9300	\N	t	2026-07-30 15:02:14.932	\N
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, email, name, "passwordHash", role, "isActive", "deletedAt", "createdAt", "updatedAt") FROM stdin;
cms7lhgg50000pmrwwx5by7lp	admin@onjung.kr	나눔플러스 최고관리자	$2a$10$HP2KVvd3KSCI1vZed.rxW.eBKwPvQ/uQHNVf4iDMgBvpQBbugH1W2	SUPER_ADMIN	t	\N	2026-07-30 14:14:25.151	2026-07-30 14:14:28.025
cms7n6xgz0005ahjz8zl3pe0t	a0000374@modugive.kr	동래구 장애인복지관	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.235	2026-07-30 15:35:59.456
cms7n6xh60009ahjzcdjaxyp7	a0000373@modugive.kr	축구종합센터 펀딩 캠페인	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.242	2026-07-30 15:35:59.467
cms7n6xha000dahjz56ms9srb	a0000372@modugive.kr	갈거리사회적협동조합	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.247	2026-07-30 15:35:59.476
cms7n6xhf000hahjzr9zqezun	a0000371@modugive.kr	독서당	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.251	2026-07-30 15:35:59.479
cms7n6xho000nahjzdjqncaf3	a0000370@modugive.kr	(재)내셔널트러스트문화유산기금	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.26	2026-07-30 15:35:59.482
cms7n6xhx000tahjzjzzvvcxo	a0000369@modugive.kr	한아름	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.269	2026-07-30 15:35:59.486
cms7n6xi8000zahjz5dn09twp	a0000368@modugive.kr	학장종합사회복지관	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.28	2026-07-30 15:35:59.489
cms7n6xil0015ahjzwdhvva8p	a0000367@modugive.kr	(사)한국의사상자협회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.293	2026-07-30 15:35:59.493
cms7n6xis001bahjzcoypugmt	a0000366@modugive.kr	진해장애인인권센터	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.3	2026-07-30 15:35:59.498
cms7n6xj0001hahjz5ccgavwt	a0000365@modugive.kr	사단법인 부산여성의전화	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.308	2026-07-30 15:35:59.503
cms7n6xj4001nahjzzwm11njw	a0000364@modugive.kr	수원새벽빛장애인야간학교	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.313	2026-07-30 15:35:59.516
cms7n6xjh001tahjzq80ct8nh	a0000363@modugive.kr	(사)한국평생교육사협회 경기도안산지회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.325	2026-07-30 15:35:59.521
cms7n6xjw001zahjzpz0k8w10	a0000362@modugive.kr	안산나무를심는장애인야학	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.341	2026-07-30 15:35:59.524
cms7n6xk50025ahjz9rq6u6u9	a0000361@modugive.kr	사단법인 아름다운손길	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.349	2026-07-30 15:35:59.527
cms7n6xka002bahjz1ogcfqaf	a0000360@modugive.kr	관악정다운의료복지사회적협동조합	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.354	2026-07-30 15:35:59.53
cms7n6xkf002hahjz2wr7a5tn	a0000359@modugive.kr	통일문화연합	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.359	2026-07-30 15:35:59.532
cms7n6xkl002nahjzcqhf12t7	a0000358@modugive.kr	선한시민의힘	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.365	2026-07-30 15:35:59.535
cms7n6xkq002tahjz2cux43ow	a0000357@modugive.kr	사랑해	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.37	2026-07-30 15:35:59.538
cms7n6xl7002zahjziec9p9ej	a0000356@modugive.kr	교육공동체더하기	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.387	2026-07-30 15:35:59.541
cms7n6xli0035ahjzqd6xe358	a0000355@modugive.kr	도토리보호작업장	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.398	2026-07-30 15:35:59.546
cms7n6xlp003bahjz4gwjjzwc	a0000354@modugive.kr	노리울예술협회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.406	2026-07-30 15:35:59.551
cms7n6xlw003hahjzhkyu1zwt	a0000353@modugive.kr	(사)축복의 다리	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.412	2026-07-30 15:35:59.561
cms7n6xm3003nahjzx6c35rbt	a0000352@modugive.kr	사단법인 대구여성회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.419	2026-07-30 15:35:59.565
cms7n6xmm003tahjzhpmcjszh	a0000351@modugive.kr	방배노인종합복지관	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.438	2026-07-30 15:35:59.568
cms7n6xmv003zahjzw0vu6d4n	a0000350@modugive.kr	파르란도 오케스트라	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.447	2026-07-30 15:35:59.571
cms7n6xn30045ahjz9qwgrzj3	a0000349@modugive.kr	행동하는성소수자인권연대	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.455	2026-07-30 15:35:59.573
cms7n6xo5004bahjzdy7p69xe	a0000348@modugive.kr	(사)파주여성민우회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.493	2026-07-30 15:35:59.577
cms7n6xoy004hahjz9zdv8oei	a0000347@modugive.kr	굿브리지	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.522	2026-07-30 15:35:59.579
cms7n6xq0004nahjzwm1l23ow	a0000346@modugive.kr	노아선교회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.561	2026-07-30 15:35:59.582
cms7n6xqy004tahjz6ublai1z	a0000345@modugive.kr	함께걷기사회적협동조합	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.595	2026-07-30 15:35:59.586
cms7n6xrf004zahjz5hgg03ip	a0000344@modugive.kr	(사)한기장쉼터요양원	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.611	2026-07-30 15:35:59.588
cms7n6xs9005bahjzgakxdcmp	a0000342@modugive.kr	한국지역아동센터연합회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.641	2026-07-30 15:35:59.596
cms7n6xsq005hahjztys9tc7x	a0000341@modugive.kr	전국개척교회연합회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.658	2026-07-30 15:35:59.603
cms7n6xt2005nahjzgtjr7sbn	a0000340@modugive.kr	(사)생명존엄재단	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.67	2026-07-30 15:35:59.613
cms7n6xtl005tahjzk5se20no	a0000339@modugive.kr	(사)어독스	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.689	2026-07-30 15:35:59.617
cms7n6xus005zahjz1zdxdyir	a0000338@modugive.kr	(사)성폭력예방치료센터	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.733	2026-07-30 15:35:59.62
cms7n6xvm0065ahjz5bk4t279	a0000337@modugive.kr	재단법인 416재단	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.762	2026-07-30 15:35:59.623
cms7n6xxc006hahjzln6xlqdt	a0000335@modugive.kr	나는부모다협회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.824	2026-07-30 15:35:59.629
cms7n6xxu006nahjzs6px51hn	a0000334@modugive.kr	아세아연합신학대학교연합선교총회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.842	2026-07-30 15:35:59.632
cms7n6xy8006tahjzcnae8c0r	a0000333@modugive.kr	임마누엘지역아동센터	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.856	2026-07-30 15:35:59.635
cms7n6xyf006zahjzl2m7ypt2	a0000332@modugive.kr	사회복지법인 한기장복지재단	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.863	2026-07-30 15:35:59.639
cms7n6xyr0075ahjzcgp9bywl	a0000331@modugive.kr	서재지역아동센터	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.875	2026-07-30 15:35:59.65
cms7n6xzq007bahjzcisju1qb	a0000330@modugive.kr	사단법인 햇살마루	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.91	2026-07-30 15:35:59.655
cms7n6y0s007hahjz4e5d6ej3	a0000329@modugive.kr	로뎀사회적협동조합(오정지역아동센터)	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.949	2026-07-30 15:35:59.658
cms7n6y14007nahjzr6r739c2	a0000328@modugive.kr	양지지역아동센터	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.961	2026-07-30 15:35:59.662
cms7n6y1i007tahjzcboncoeq	a0000327@modugive.kr	국민사랑의회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.974	2026-07-30 15:35:59.665
cms7n6y1n007zahjzry2ykqtw	a0000326@modugive.kr	사단법인 해피피플	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.98	2026-07-30 15:35:59.667
cms7n6y1z0085ahjzkaj1njcu	a0000325@modugive.kr	(사)이주민과함께	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.992	2026-07-30 15:35:59.669
cms7n6y2b008bahjzittqa05h	a0000324@modugive.kr	구미시 반려동물구조협회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.003	2026-07-30 15:35:59.672
cms7n6y2i008hahjzdnstnygz	a0000323@modugive.kr	사단법인 두드림글로벌재단	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.011	2026-07-30 15:35:59.676
cms7n6y2p008nahjzjor33479	a0000322@modugive.kr	주랑지역아동센터	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.017	2026-07-30 15:35:59.681
cms7n6y2u008tahjz4qzuwqo5	a0000321@modugive.kr	보물섬지역아동센터	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.023	2026-07-30 15:35:59.686
cms7n6y32008xahjzny79aldo	a0000320@modugive.kr	금천장애인종합복지관	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.03	2026-07-30 15:35:59.698
cms7n6y3f0093ahjz1ycap41j	a0000319@modugive.kr	(사)희망둥지나욧	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.044	2026-07-30 15:35:59.702
cms7n6y3r0099ahjz3khpqzuv	a0000318@modugive.kr	(사)세계평화청년학생연합	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.056	2026-07-30 15:35:59.704
cms7n6y3y009fahjz8x8d1ooy	a0000317@modugive.kr	사단법인 코인트리	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.062	2026-07-30 15:35:59.707
cms7n6y46009lahjzg5ypx4qw	a0000316@modugive.kr	(사)아시아교류협회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.071	2026-07-30 15:35:59.711
cms7n6y4f009pahjz8f3sglhw	a0000315@modugive.kr	힐링라이프선교회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.079	2026-07-30 15:35:59.713
cms7n6y4s009vahjzhewlb25c	a0000314@modugive.kr	이룸지역아동센터	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.092	2026-07-30 15:35:59.716
cms7n6y5300a1ahjzudhyhwvs	a0000313@modugive.kr	사회적협동조합 보아스사회공헌재단	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.104	2026-07-30 15:35:59.718
cms7n6y5900a7ahjzcr1agep5	a0000312@modugive.kr	온고을지역아동센터	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.109	2026-07-30 15:35:59.72
cms7n6y6000ajahjzc7ldexg1	a0000310@modugive.kr	응암노인복지관	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.137	2026-07-30 15:35:59.747
cms7n6y6800apahjzgctdxcv7	a0000309@modugive.kr	기독교대한감리회 라이트하우스교회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.145	2026-07-30 15:35:59.75
cms7n6y6f00avahjzoksvdkds	a0000308@modugive.kr	윙크	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.151	2026-07-30 15:35:59.753
cms7n6y6k00b1ahjz72mfwh8h	a0000307@modugive.kr	덕산지역아동센터(충남예산)	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.156	2026-07-30 15:35:59.756
cms7n6y6t00b7ahjzc46dt7b8	a0000306@modugive.kr	재단법인 대한국인	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.166	2026-07-30 15:35:59.758
cms7n6y7700bdahjzedh8yq7q	a0000305@modugive.kr	나눔종합사회복지관	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.18	2026-07-30 15:35:59.761
cms7n6y7f00bhahjzght0vph0	a0000304@modugive.kr	두손애장학회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.188	2026-07-30 15:35:59.765
cms7n6y7m00blahjzyk9dl270	a0000303@modugive.kr	신애원	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.194	2026-07-30 15:35:59.767
cms7n6y7r00bpahjzwpm5shcg	a0000302@modugive.kr	국제슬로푸드한국협회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.199	2026-07-30 15:35:59.77
cms7n6y8000bvahjzjwefhv1q	a0000301@modugive.kr	인천힐링센터	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.208	2026-07-30 15:35:59.774
cms7n6y8800c1ahjzulqq2ndg	a0000300@modugive.kr	희망한국	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.216	2026-07-30 15:35:59.778
cms7n6y8j00c5ahjzj6f4rbjv	a0000299@modugive.kr	마포장애인주간보호센터	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.227	2026-07-30 15:35:59.785
cms7n6y8t00cbahjzl1xz58hq	a0000298@modugive.kr	울산동구종합사회복지관	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.237	2026-07-30 15:35:59.79
cms7n6y8y00chahjzxmort2ta	a0000297@modugive.kr	우리동물병원생명사회적협동조합	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.242	2026-07-30 15:35:59.794
cms7n6y9900ctahjzjr3qqs2y	a0000295@modugive.kr	사단법인광주여성민우회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.254	2026-07-30 15:35:59.8
cms7n6y9e00czahjzq4z5wuxq	a0000294@modugive.kr	(사)토닥토닥	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.258	2026-07-30 15:35:59.803
cms7n6y9k00d5ahjztqu5d0yv	a0000293@modugive.kr	(사)피스모모	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.265	2026-07-30 15:35:59.805
cms7n6y9w00dbahjz2lposjsw	a0000292@modugive.kr	여성환경연대	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.276	2026-07-30 15:35:59.809
cms7n6ya600dhahjz9tulz9ow	a0000291@modugive.kr	사회복지연구소	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.287	2026-07-30 15:35:59.811
cms7n6yac00dnahjz8a8u1yai	a0000290@modugive.kr	(사)한국뇌병변장애인인권협회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.292	2026-07-30 15:35:59.813
cms7n6yag00dtahjzmansgm1k	a0000289@modugive.kr	(사)한국뇌병변장애인인권협회 서울협회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.296	2026-07-30 15:35:59.816
cms7n6yal00dzahjzkp3b9c6j	a0000288@modugive.kr	사단법인 김포여성의전화	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.302	2026-07-30 15:35:59.821
cms7n6yar00e5ahjz7elnxvll	a0000287@modugive.kr	한국해비타트	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.308	2026-07-30 15:35:59.825
cms7n6yb300ebahjz4e3aqtct	a0000286@modugive.kr	사단법인인천여성민우회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.319	2026-07-30 15:35:59.834
cms7n6ybb00ehahjz9xpeznki	a0000285@modugive.kr	사단법인 수원여성의전화	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.328	2026-07-30 15:35:59.839
cms7n6ybh00enahjzwxj37a6s	a0000284@modugive.kr	사단법인 서울동북여성민우회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.333	2026-07-30 15:35:59.842
cms7n6ybm00etahjzurz0v6rm	a0000283@modugive.kr	사단법인마포희망나눔	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.338	2026-07-30 15:35:59.848
cms7n6ybq00ezahjzr2v8niak	a0000282@modugive.kr	인드라망생명공동체	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.343	2026-07-30 15:35:59.851
cms7n6ybv00f5ahjz8lcz0ilr	a0000281@modugive.kr	(사)안산여성노동자회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.347	2026-07-30 15:35:59.854
cms7n6yc600fbahjz4od92qx5	a0000280@modugive.kr	서울남서여성민우회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.358	2026-07-30 15:35:59.857
cms7n6ycf00fhahjzs2y3iuwj	a0000279@modugive.kr	겨레하나	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.367	2026-07-30 15:35:59.86
cms7n6ycp00fnahjzqwr2lr3o	a0000278@modugive.kr	서울환경운동연합	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.377	2026-07-30 15:35:59.864
cms7n6ycu00ftahjz01y5evqg	a0000277@modugive.kr	서울강서양천여성의전화	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.383	2026-07-30 15:35:59.866
cms7n6yd000fzahjz8pwk5nzq	a0000276@modugive.kr	인구협회 광주성폭력상담소	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.388	2026-07-30 15:35:59.871
cms7n6yd700g5ahjzwlrhaozd	a0000275@modugive.kr	김포장애인야학	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.396	2026-07-30 15:35:59.876
cms7n6ydl00gbahjz5797nkcj	a0000274@modugive.kr	환경운동연합	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.409	2026-07-30 15:35:59.885
cms7n6ydt00ghahjz0jj4jple	a0000273@modugive.kr	한국여성정치네트워크	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.418	2026-07-30 15:35:59.889
cms7n6ydz00gnahjz5tmeodib	a0000272@modugive.kr	엔젤프로젝트	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.423	2026-07-30 15:35:59.891
cms7n6ye300gtahjzvfnxzcpz	a0000271@modugive.kr	행동하는 동물사랑	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.427	2026-07-30 15:35:59.895
cms7n6ye700gzahjz0s313gp7	a0000270@modugive.kr	젠더정치연구소	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.431	2026-07-30 15:35:59.898
cms7n6yeg00h5ahjztkkl64i4	a0000269@modugive.kr	울산여성의전화	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.44	2026-07-30 15:35:59.9
cms7n6yep00hbahjz9q3cl52j	a0000268@modugive.kr	다사랑공동체	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.449	2026-07-30 15:35:59.902
cms7n6yf200hnahjzbs130div	a0000266@modugive.kr	사단법인 글로벌투게더	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.463	2026-07-30 15:35:59.91
cms7n6yfa00htahjzm4xow631	a0000265@modugive.kr	사단법인 복지국가소사이어티	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.47	2026-07-30 15:35:59.913
cms7n6yfe00hzahjzpetllt32	a0000264@modugive.kr	유네스코 한국위원회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.475	2026-07-30 15:35:59.918
cms7n6yfi00i5ahjz3ljqwyhd	a0000263@modugive.kr	(사회복지법인) 대한불교조계종사회복지재단	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.478	2026-07-30 15:35:59.929
cms7n6yfo00ibahjz8f2k89oi	a0000262@modugive.kr	사단법인 복음의전함	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.485	2026-07-30 15:35:59.933
cms7n6yfv00ihahjz4zig87s5	a0000261@modugive.kr	사단법인 푸른아시아	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.492	2026-07-30 15:35:59.936
cms7n6yg800inahjzpcb2n13k	a0000260@modugive.kr	(사단)한국조혈모세포은행협회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.504	2026-07-30 15:35:59.939
cms7n6ygf00itahjzu78fetu1	a0000259@modugive.kr	사단법인 생명지대	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.511	2026-07-30 15:35:59.942
cms7n6ygj00ixahjzaxwqonyl	a0000258@modugive.kr	사단법인 함께하는한숲	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.516	2026-07-30 15:35:59.944
cms7n6ygo00j3ahjz5a5x9ray	a0000257@modugive.kr	바다사랑해군장학재단	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.52	2026-07-30 15:35:59.946
cms7n6ygx00jfahjzgcr7mmz0	a0000255@modugive.kr	국제나눔연대	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.529	2026-07-30 15:35:59.952
cms7n6yh300jlahjzmnk0n3vb	a0000254@modugive.kr	한국성적소수자문화인권센터	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.535	2026-07-30 15:35:59.956
cms7n6yhh00jrahjzvro8o40h	a0000253@modugive.kr	비온뒤무지개	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.549	2026-07-30 15:35:59.96
cms7n6yhq00jxahjz52qfu1o1	a0000252@modugive.kr	사단법인 희망래일	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.558	2026-07-30 15:35:59.965
cms7n6yhu00k3ahjzk1p9tdjp	a0000251@modugive.kr	재단법인 승일희망재단	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.563	2026-07-30 15:35:59.974
cms7n6yhz00k9ahjzecle7lnx	a0000250@modugive.kr	친구사이	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.567	2026-07-30 15:35:59.98
cms7n6yi600kfahjzi7bema45	a0000249@modugive.kr	뚝딱장난감	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.574	2026-07-30 15:35:59.983
cms7n6yif00klahjzmjd2rjrx	a0000248@modugive.kr	경상남도아동보호전문기관	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.583	2026-07-30 15:35:59.986
cms7n6yiv00krahjz99o7mhla	a0000247@modugive.kr	유엔환경계획한국협회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.599	2026-07-30 15:35:59.988
cms7n6yj400kxahjz0k97684a	a0000246@modugive.kr	경남종합사회복지관	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.608	2026-07-30 15:35:59.991
cms7n6yja00l3ahjz57l3or0i	a0000245@modugive.kr	재단법인 아름다운 동행	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.614	2026-07-30 15:35:59.995
cms7n6yji00l9ahjzw8a1vcxq	a0000244@modugive.kr	사단법인 글로벌호프	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.623	2026-07-30 15:35:59.997
cms7n6yju00lfahjz4tl9u4bz	a0000243@modugive.kr	인터넷뉴스 신문고	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.635	2026-07-30 15:35:59.999
cms7n6yka00ljahjz89le7zib	a0000242@modugive.kr	사단법인 사랑나눔전국네트워크	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.65	2026-07-30 15:36:00.004
cms7n6ykh00lnahjzt4cyausw	a0000241@modugive.kr	kh TV	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.658	2026-07-30 15:36:00.007
cms7n6ykn00ltahjz22ule3bc	a0000240@modugive.kr	(사)프렌드아시아	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.663	2026-07-30 15:36:00.011
cms7n6ykw00lzahjzywh2n4ks	a0000239@modugive.kr	사단법인 비전케어	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.673	2026-07-30 15:36:00.02
cms7n6ylg00m5ahjzrebcpg36	a0000238@modugive.kr	(사) 부스러기사랑나눔회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.692	2026-07-30 15:36:00.026
cms7n6ylq00mbahjzosotv9a8	a0000237@modugive.kr	사단법인 인순이와 좋은 사람들	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.703	2026-07-30 15:36:00.031
cms7n6ylx00mhahjzf8mg1o5u	a0000236@modugive.kr	대한불교조계종 유지재단	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.709	2026-07-30 15:36:00.036
cms7n6ymn00mtahjzmgdev0kz	a0000234@modugive.kr	한국복음서원(생명의흐름TV)	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.736	2026-07-30 15:36:00.044
cms7n6ymv00mzahjzev90pr35	a0000233@modugive.kr	희망을 파는 사람들(대구)	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.743	2026-07-30 15:36:00.049
cms7n6yn100n5ahjzn1z5ocnb	a0000232@modugive.kr	(사)한국성폭력상담소	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.75	2026-07-30 15:36:00.053
cms7n6yn800nbahjzc9h31u5u	a0000231@modugive.kr	강릉씨네마떼끄	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.757	2026-07-30 15:36:00.057
cms7n6yne00nhahjz6tt0j9z8	a0000230@modugive.kr	대안문화연대 민들레의 꿈	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.762	2026-07-30 15:36:00.067
cms7n6ynn00nlahjzfouh1ap9	a0000229@modugive.kr	광명여성의전화	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.771	2026-07-30 15:36:00.07
cms7n6yo400nrahjz2lxsukr3	a0000228@modugive.kr	한국청소년보호협회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.788	2026-07-30 15:36:00.072
cms7n6yoa00nvahjz6ulaptsh	a0000227@modugive.kr	(사)한국여성단체연합	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.794	2026-07-30 15:36:00.075
cms7n6yog00o1ahjzjoyyf0tn	a0000226@modugive.kr	대구여성의전화	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.8	2026-07-30 15:36:00.078
cms7n6yom00o7ahjzj2uj3kp3	a0000225@modugive.kr	사단법인 고양파주여성민우회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.807	2026-07-30 15:36:00.081
cms7n6yot00obahjzm6bch6ib	a0000224@modugive.kr	인권교육센터 들	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.813	2026-07-30 15:36:00.083
cms7n6yp700ohahjzjojfg4bk	a0000223@modugive.kr	강화여성의전화	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.827	2026-07-30 15:36:00.085
cms7n6ypg00onahjzlec6l7a1	a0000222@modugive.kr	성매매문제해결을위한전국연대	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.837	2026-07-30 15:36:00.088
cms7n6ypm00otahjzjputxa1l	a0000221@modugive.kr	(사)광주여성의전화	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.842	2026-07-30 15:36:00.09
cms7n6ypr00ozahjzfx7tv12e	a0000220@modugive.kr	군포여성민우회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.848	2026-07-30 15:36:00.093
cms7n6ypz00p5ahjz9xcnz9m0	a0000219@modugive.kr	춘천여성민우회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.856	2026-07-30 15:36:00.096
cms7n6yqc00pbahjz89vxbx39	a0000218@modugive.kr	재단법인 한국메이크어위시소원별재단	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.869	2026-07-30 15:36:00.099
cms7n6yqm00phahjzwfvlcc2z	a0000217@modugive.kr	경기장애인자립생활센터협의회 안산시지부	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.878	2026-07-30 15:36:00.105
cms7n6xgl0001ahjzslf77sry	a0000375@modugive.kr	시온쉼터	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.222	2026-07-30 15:35:58.792
cms7n6xrv0055ahjzpasun5to	a0000343@modugive.kr	(사)서울퀴어문화축제조직위원회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.627	2026-07-30 15:35:59.592
cms7n6xw3006bahjzv8ly3ssv	a0000336@modugive.kr	도로시지켜줄개	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:13.779	2026-07-30 15:35:59.626
cms7n6y5l00adahjz0rvz1b3f	a0000311@modugive.kr	가온사회적협동조합(소망지역아동센터)	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.121	2026-07-30 15:35:59.741
cms7n6y9200cnahjzmn2e6863	a0000296@modugive.kr	진주시민미디어센터	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.247	2026-07-30 15:35:59.797
cms7n6yex00hhahjzy4990f15	a0000267@modugive.kr	시립남부장애인종합복지관	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.457	2026-07-30 15:35:59.905
cms7n6ygs00j9ahjz9swc8nij	a0000256@modugive.kr	한민족복지재단	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.524	2026-07-30 15:35:59.95
cms7n6ym600mnahjz6xquzyq8	a0000235@modugive.kr	사단법인 난치병아동돕기운동본부	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.719	2026-07-30 15:36:00.039
cms7n6yqr00plahjz1pfxr82r	a0000216@modugive.kr	대학입시거부로 삶을 바꾸는 투명가방끈	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.883	2026-07-30 15:36:00.112
cms7n6yqv00prahjzkaeqjd3y	a0000215@modugive.kr	사단법인 한국나눔연맹	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.887	2026-07-30 15:36:00.115
cms7n6yr100pxahjz5wo27muq	a0000214@modugive.kr	한국여성민우회	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.893	2026-07-30 15:36:00.117
cms7n6yrb00q3ahjzicw1q86l	a0000213@modugive.kr	(사)한국여성의전화	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.903	2026-07-30 15:36:00.119
cms7n6yro00q9ahjzz3gkflob	a0000212@modugive.kr	나눔과나눔	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.916	2026-07-30 15:36:00.122
cms7n6yrw00qfahjzzd0i4ase	a0000211@modugive.kr	경제정의실천시민연합	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.924	2026-07-30 15:36:00.125
cms7n6ys200qlahjz1lvspbol	a0000210@modugive.kr	(주)여성신문사	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.93	2026-07-30 15:36:00.127
cms7n6ys700qrahjzdm163l4k	a0000209@modugive.kr	NGO 엔지오	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.935	2026-07-30 15:36:00.129
cms7n6ysc00qvahjz27i7g536	a0000208@modugive.kr	월드라인	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.94	2026-07-30 15:36:00.132
cms7n6ysf00qzahjzkcf28pyu	a0000207@modugive.kr	세이브더칠드런	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.943	2026-07-30 15:36:00.134
cms7n6ysk00r3ahjznx1t0kbt	a0000206@modugive.kr	목동 천주교	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.949	2026-07-30 15:36:00.136
cms7n6ysu00r7ahjz5pmgdmka	a0000205@modugive.kr	실망이음	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.958	2026-07-30 15:36:00.14
cms7n6yt400rbahjzdz8p8od4	a0000203@modugive.kr	굿네이버스	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.968	2026-07-30 15:36:00.143
cms7n6yta00rfahjz0sufdi0x	a0000202@modugive.kr	강화도 봉은사	$2a$12$4d7eXzESR.ip8naJvabbHOYquu1mu1fuwgs.qIJw.Q2ob/aPDx6xi	ORG_ADMIN	t	\N	2026-07-30 15:02:14.975	2026-07-30 15:36:00.152
\.


--
-- Data for Name: VerificationToken; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."VerificationToken" (identifier, token, expires) FROM stdin;
\.


--
-- Data for Name: WebhookEvent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."WebhookEvent" (id, provider, "eventType", payload, processed, "processedAt", error, "createdAt") FROM stdin;
cms7lhhex00orpmrwag3l5ey0	infobank	sms.mo	{"amount": 3000, "status": "COMPLETED", "smsBody": "행복한 하루 되세요", "senderPhone": "010-3654-4907", "smsFullNumber": "#2540-7942", "providerTransactionId": "IFB-WH-0-1785420866408"}	t	2026-07-25 05:02:11	\N	2026-07-30 14:14:26.409
cms7lhhez00ospmrwugm09in6	infobank	sms.mo	{"amount": 3000, "status": "COMPLETED", "smsBody": "오늘도 수고하십니다", "senderPhone": "010-4467-2958", "smsFullNumber": "#2540-2580", "providerTransactionId": "IFB-WH-1-1785420866410"}	t	2026-07-25 02:22:14	\N	2026-07-30 14:14:26.412
cms7lhhf000otpmrw0u1nepj9	infobank	sms.mo	{"amount": 3000, "status": "COMPLETED", "smsBody": "도움이 되길 바랍니다", "senderPhone": "010-4861-1612", "smsFullNumber": "#2540-5621", "providerTransactionId": "IFB-WH-2-1785420866411"}	t	2026-07-20 12:08:05	\N	2026-07-30 14:14:26.413
cms7lhhf100oupmrw71ds6y5a	infobank	sms.mo	{"amount": 3000, "status": "COMPLETED", "smsBody": "아이들을 응원합니다", "senderPhone": "010-1006-2554", "smsFullNumber": "#2540-8834", "providerTransactionId": "IFB-WH-3-1785420866412"}	t	2026-07-26 23:58:12	\N	2026-07-30 14:14:26.414
cms7lhhf200ovpmrwkgna5n3p	infobank	sms.mo	{"amount": 3000, "status": "COMPLETED", "smsBody": "후원합니다", "senderPhone": "010-6080-6269", "smsFullNumber": "#2540-3310", "providerTransactionId": "IFB-WH-4-1785420866413"}	t	2026-07-30 08:39:16	\N	2026-07-30 14:14:26.414
cms7lhhf300owpmrwqcti59a1	infobank	sms.mo	{"amount": 3000, "status": "COMPLETED", "smsBody": "행복한 하루 되세요", "senderPhone": "010-9409-5956", "smsFullNumber": "#2540-7942", "providerTransactionId": "IFB-WH-5-1785420866414"}	t	2026-07-22 03:11:59	\N	2026-07-30 14:14:26.415
cms7lhhf400oxpmrwtifww46n	infobank	sms.mo	{"amount": 3000, "status": "COMPLETED", "smsBody": "도움이 필요한 분들을 위해", "senderPhone": "010-5577-8636", "smsFullNumber": "#2540-8834", "providerTransactionId": "IFB-WH-6-1785420866415"}	t	2026-07-24 09:20:53	\N	2026-07-30 14:14:26.417
cms7lhhf600oypmrwt7xmejga	infobank	sms.mo	{"amount": 3000, "status": "COMPLETED", "smsBody": "도움이 필요한 분들을 위해", "senderPhone": "010-5011-2634", "smsFullNumber": "#2540-2580", "providerTransactionId": "IFB-WH-7-1785420866417"}	t	2026-07-24 12:59:52	\N	2026-07-30 14:14:26.418
cms7lhhf700ozpmrwjdsanxns	infobank	sms.mo	{"amount": 3000, "status": "COMPLETED", "smsBody": "화이팅", "senderPhone": "010-9576-2836", "smsFullNumber": "#2540-1234", "providerTransactionId": "IFB-WH-8-1785420866418"}	t	2026-07-28 01:16:51	\N	2026-07-30 14:14:26.42
cms7lhhf800p0pmrwlkfy8oi4	infobank	sms.mo	{"amount": 3000, "status": "COMPLETED", "smsBody": "이웃에게 따뜻한 손을", "senderPhone": "010-3122-7263", "smsFullNumber": "#2540-3310", "providerTransactionId": "IFB-WH-9-1785420866419"}	t	2026-07-28 02:49:50	\N	2026-07-30 14:14:26.421
cms7lhhf900p1pmrwgtra3bjw	infobank	sms.mo	{"amount": 3000, "status": "COMPLETED", "smsBody": "응원합니다", "senderPhone": "010-9181-5951", "smsFullNumber": "#2540-3310", "providerTransactionId": "IFB-WH-10-1785420866420"}	t	2026-07-29 05:08:07	\N	2026-07-30 14:14:26.422
cms7lhhfa00p2pmrwk9vt961w	infobank	sms.mo	{"amount": 3000, "status": "COMPLETED", "smsBody": "이웃에게 따뜻한 손을", "senderPhone": "010-4892-4252", "smsFullNumber": "#2540-5621", "providerTransactionId": "IFB-WH-11-1785420866421"}	t	2026-07-30 13:10:29	\N	2026-07-30 14:14:26.423
\.


--
-- Name: Account Account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: CampaignImage CampaignImage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CampaignImage"
    ADD CONSTRAINT "CampaignImage_pkey" PRIMARY KEY (id);


--
-- Name: Campaign Campaign_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Campaign"
    ADD CONSTRAINT "Campaign_pkey" PRIMARY KEY (id);


--
-- Name: Donation Donation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Donation"
    ADD CONSTRAINT "Donation_pkey" PRIMARY KEY (id);


--
-- Name: Donor Donor_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Donor"
    ADD CONSTRAINT "Donor_pkey" PRIMARY KEY (id);


--
-- Name: OrganizationAdmin OrganizationAdmin_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OrganizationAdmin"
    ADD CONSTRAINT "OrganizationAdmin_pkey" PRIMARY KEY (id);


--
-- Name: OrganizationFee OrganizationFee_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OrganizationFee"
    ADD CONSTRAINT "OrganizationFee_pkey" PRIMARY KEY (id);


--
-- Name: Organization Organization_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Organization"
    ADD CONSTRAINT "Organization_pkey" PRIMARY KEY (id);


--
-- Name: QrCode QrCode_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."QrCode"
    ADD CONSTRAINT "QrCode_pkey" PRIMARY KEY (id);


--
-- Name: RecurringDonation RecurringDonation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RecurringDonation"
    ADD CONSTRAINT "RecurringDonation_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: SettlementItem SettlementItem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SettlementItem"
    ADD CONSTRAINT "SettlementItem_pkey" PRIMARY KEY (id);


--
-- Name: Settlement Settlement_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Settlement"
    ADD CONSTRAINT "Settlement_pkey" PRIMARY KEY (id);


--
-- Name: SmsNumberAssignment SmsNumberAssignment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SmsNumberAssignment"
    ADD CONSTRAINT "SmsNumberAssignment_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: WebhookEvent WebhookEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."WebhookEvent"
    ADD CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY (id);


--
-- Name: Account_provider_providerAccountId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON public."Account" USING btree (provider, "providerAccountId");


--
-- Name: Account_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Account_userId_idx" ON public."Account" USING btree ("userId");


--
-- Name: AuditLog_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_createdAt_idx" ON public."AuditLog" USING btree ("createdAt");


--
-- Name: AuditLog_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_userId_idx" ON public."AuditLog" USING btree ("userId");


--
-- Name: CampaignImage_campaignId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "CampaignImage_campaignId_idx" ON public."CampaignImage" USING btree ("campaignId");


--
-- Name: Campaign_organizationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Campaign_organizationId_idx" ON public."Campaign" USING btree ("organizationId");


--
-- Name: Campaign_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Campaign_slug_key" ON public."Campaign" USING btree (slug);


--
-- Name: Donation_campaignId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Donation_campaignId_idx" ON public."Donation" USING btree ("campaignId");


--
-- Name: Donation_channel_status_donatedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Donation_channel_status_donatedAt_idx" ON public."Donation" USING btree (channel, status, "donatedAt");


--
-- Name: Donation_deletedAt_donatedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Donation_deletedAt_donatedAt_idx" ON public."Donation" USING btree ("deletedAt", "donatedAt");


--
-- Name: Donation_organizationId_channel_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Donation_organizationId_channel_idx" ON public."Donation" USING btree ("organizationId", channel);


--
-- Name: Donation_organizationId_donatedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Donation_organizationId_donatedAt_idx" ON public."Donation" USING btree ("organizationId", "donatedAt");


--
-- Name: Donation_providerTransactionId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Donation_providerTransactionId_key" ON public."Donation" USING btree ("providerTransactionId");


--
-- Name: Donation_status_donatedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Donation_status_donatedAt_idx" ON public."Donation" USING btree (status, "donatedAt");


--
-- Name: Donor_organizationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Donor_organizationId_idx" ON public."Donor" USING btree ("organizationId");


--
-- Name: Donor_organizationId_phone_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Donor_organizationId_phone_idx" ON public."Donor" USING btree ("organizationId", phone);


--
-- Name: OrganizationAdmin_organizationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "OrganizationAdmin_organizationId_idx" ON public."OrganizationAdmin" USING btree ("organizationId");


--
-- Name: OrganizationAdmin_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "OrganizationAdmin_userId_key" ON public."OrganizationAdmin" USING btree ("userId");


--
-- Name: OrganizationFee_organizationId_channel_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "OrganizationFee_organizationId_channel_key" ON public."OrganizationFee" USING btree ("organizationId", channel);


--
-- Name: OrganizationFee_organizationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "OrganizationFee_organizationId_idx" ON public."OrganizationFee" USING btree ("organizationId");


--
-- Name: Organization_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Organization_slug_key" ON public."Organization" USING btree (slug);


--
-- Name: Organization_smsCode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Organization_smsCode_key" ON public."Organization" USING btree ("smsCode");


--
-- Name: Organization_smsFullNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Organization_smsFullNumber_key" ON public."Organization" USING btree ("smsFullNumber");


--
-- Name: QrCode_organizationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "QrCode_organizationId_idx" ON public."QrCode" USING btree ("organizationId");


--
-- Name: RecurringDonation_organizationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RecurringDonation_organizationId_idx" ON public."RecurringDonation" USING btree ("organizationId");


--
-- Name: RecurringDonation_providerContractId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "RecurringDonation_providerContractId_key" ON public."RecurringDonation" USING btree ("providerContractId");


--
-- Name: Session_sessionToken_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Session_sessionToken_key" ON public."Session" USING btree ("sessionToken");


--
-- Name: Session_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Session_userId_idx" ON public."Session" USING btree ("userId");


--
-- Name: SettlementItem_donationId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "SettlementItem_donationId_key" ON public."SettlementItem" USING btree ("donationId");


--
-- Name: SettlementItem_settlementId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SettlementItem_settlementId_idx" ON public."SettlementItem" USING btree ("settlementId");


--
-- Name: Settlement_organizationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Settlement_organizationId_idx" ON public."Settlement" USING btree ("organizationId");


--
-- Name: Settlement_organizationId_period_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Settlement_organizationId_period_key" ON public."Settlement" USING btree ("organizationId", period);


--
-- Name: Settlement_scheduledDate_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Settlement_scheduledDate_idx" ON public."Settlement" USING btree ("scheduledDate");


--
-- Name: Settlement_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Settlement_status_idx" ON public."Settlement" USING btree (status);


--
-- Name: SmsNumberAssignment_fullNumber_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SmsNumberAssignment_fullNumber_isActive_idx" ON public."SmsNumberAssignment" USING btree ("fullNumber", "isActive");


--
-- Name: SmsNumberAssignment_organizationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SmsNumberAssignment_organizationId_idx" ON public."SmsNumberAssignment" USING btree ("organizationId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: VerificationToken_identifier_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON public."VerificationToken" USING btree (identifier, token);


--
-- Name: VerificationToken_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "VerificationToken_token_key" ON public."VerificationToken" USING btree (token);


--
-- Name: WebhookEvent_provider_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "WebhookEvent_provider_createdAt_idx" ON public."WebhookEvent" USING btree (provider, "createdAt");


--
-- Name: Account Account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AuditLog AuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CampaignImage CampaignImage_campaignId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."CampaignImage"
    ADD CONSTRAINT "CampaignImage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES public."Campaign"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Campaign Campaign_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Campaign"
    ADD CONSTRAINT "Campaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Donation Donation_campaignId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Donation"
    ADD CONSTRAINT "Donation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES public."Campaign"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Donation Donation_donorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Donation"
    ADD CONSTRAINT "Donation_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES public."Donor"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Donation Donation_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Donation"
    ADD CONSTRAINT "Donation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Donor Donor_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Donor"
    ADD CONSTRAINT "Donor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OrganizationAdmin OrganizationAdmin_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OrganizationAdmin"
    ADD CONSTRAINT "OrganizationAdmin_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OrganizationAdmin OrganizationAdmin_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OrganizationAdmin"
    ADD CONSTRAINT "OrganizationAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OrganizationFee OrganizationFee_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."OrganizationFee"
    ADD CONSTRAINT "OrganizationFee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: QrCode QrCode_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."QrCode"
    ADD CONSTRAINT "QrCode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RecurringDonation RecurringDonation_donorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RecurringDonation"
    ADD CONSTRAINT "RecurringDonation_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES public."Donor"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RecurringDonation RecurringDonation_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RecurringDonation"
    ADD CONSTRAINT "RecurringDonation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Session Session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SettlementItem SettlementItem_donationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SettlementItem"
    ADD CONSTRAINT "SettlementItem_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES public."Donation"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SettlementItem SettlementItem_settlementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SettlementItem"
    ADD CONSTRAINT "SettlementItem_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES public."Settlement"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Settlement Settlement_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Settlement"
    ADD CONSTRAINT "Settlement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SmsNumberAssignment SmsNumberAssignment_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SmsNumberAssignment"
    ADD CONSTRAINT "SmsNumberAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict EeeiybllQPm93qadq2V2mIlSI0pFyMiaYDrUKhGUxd9WwmBhgauQzjfPbuS4uJq


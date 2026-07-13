import { Router, type IRouter } from "express";
import { orgContextMiddleware, requireAuth } from "../middlewares/requireAuth";
import healthRouter from "./health";
import stagesRouter from "./stages";
import suppliersRouter from "./suppliers";
import buyersRouter from "./buyers";
import dealsRouter from "./deals";
import shipmentsRouter from "./shipments";
import messagesRouter from "./messages";
import tasksRouter from "./tasks";
import documentsRouter from "./documents";
import predictionsRouter from "./predictions";
import copilotRouter from "./copilot";
import webhooksRouter from "./webhooks";
import settingsRouter from "./settings";
import integrationsRouter from "./integrations";
import rfqsRouter from "./rfqs";
import sampleRequestsRouter from "./sample-requests";
import teamRouter from "./team";
import focusRouter from "./focus";
import pushTokensRouter from "./push-tokens";
import captureRouter from "./capture";
import shortcutsRouter from "./shortcuts";
import contactRulesRouter from "./contact-rules";
import reportsRouter from "./reports";
import onboardingRouter from "./onboarding";

const router: IRouter = Router();

router.use(orgContextMiddleware);

// Public / self-bootstrapping routes — no provisioned membership required
router.use(healthRouter);
router.use(webhooksRouter);
router.use(teamRouter); // handles its own auth (requireClerkAuth for provision-self, requireAuth for the rest)
router.use(captureRouter); // handles its own auth (Clerk session OR Bearer device token)
router.use(shortcutsRouter); // serves the pre-built .shortcut binary; no auth needed

// Protected routes — require a valid JWT AND a provisioned team_users row
const protectedRouter = Router();
protectedRouter.use(requireAuth);
protectedRouter.use(stagesRouter);
protectedRouter.use(suppliersRouter);
protectedRouter.use(buyersRouter);
protectedRouter.use(dealsRouter);
protectedRouter.use(shipmentsRouter);
protectedRouter.use(messagesRouter);
protectedRouter.use(tasksRouter);
protectedRouter.use(documentsRouter);
protectedRouter.use(predictionsRouter);
protectedRouter.use(copilotRouter);
protectedRouter.use(focusRouter);
protectedRouter.use(settingsRouter);
protectedRouter.use(integrationsRouter);
protectedRouter.use(rfqsRouter);
protectedRouter.use(sampleRequestsRouter);
protectedRouter.use(pushTokensRouter);
protectedRouter.use(contactRulesRouter);
protectedRouter.use(reportsRouter);
protectedRouter.use(onboardingRouter);

router.use(protectedRouter);

export default router;

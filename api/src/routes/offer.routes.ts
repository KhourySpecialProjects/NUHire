import { Router } from 'express';
import { Connection } from 'mysql2';
import { OfferController } from '../controllers/offer.controller';
import { requireAuth } from '../middleware/auth.middleware';

export default (db: Connection): Router => {
  const router = Router();
  const offerController = new OfferController(db);

  router.post('/', requireAuth, offerController.createOffer);
  router.get('/group/:group_id/class/:class_id', requireAuth, offerController.getOffersByGroupAndClass);
  router.get('/class/:class_id', requireAuth, offerController.getOffersByClass);
  router.put('/:offer_id', requireAuth, offerController.updateOffer);

  return router;
};
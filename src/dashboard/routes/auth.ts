import { Router } from 'express';
import passport from 'passport';

export const authRouter = Router();

authRouter.get('/discord', (req, res, next) => {
  if (req.query.returnTo) {
    req.session.returnTo = req.query.returnTo as string;
  }
  passport.authenticate('discord')(req, res, next);
});

authRouter.get(
  '/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/?error=auth_failed' }),
  (req, res) => {
    const returnTo = req.session.returnTo ?? '/dashboard';
    delete req.session.returnTo;
    res.redirect(returnTo);
  }
);

authRouter.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

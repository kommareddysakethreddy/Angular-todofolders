import { Injectable, inject } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut, User, sendPasswordResetEmail, fetchSignInMethodsForEmail } from '@angular/fire/auth';
import { from, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);

  signup(email: string, password: string) {
    return from(createUserWithEmailAndPassword(this.auth, email, password));
  }

  login(email: string, password: string) {
    return from(signInWithEmailAndPassword(this.auth, email, password));
  }

  logout() {
    return from(signOut(this.auth));
  }

  onAuth(cb: (user: User | null) => void) {
    return onAuthStateChanged(this.auth, cb);
  }

  resetPassword(email: string) {
    return from(sendPasswordResetEmail(this.auth, email));
  }

  fetchMethods(email: string) {
    return from(fetchSignInMethodsForEmail(this.auth, email));
  }
}

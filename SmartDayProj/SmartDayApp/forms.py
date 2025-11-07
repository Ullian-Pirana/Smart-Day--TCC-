from django import forms
from .models import Casa
from django.contrib.auth.models import User

class CasaForm(forms.ModelForm):
    class Meta:
        model = Casa
        fields = ['nome']

class AddUserForm(forms.Form):
    usuario = forms.CharField(widget=forms.HiddenInput())

class RegistroForm(forms.ModelForm):
    password = forms.CharField(widget=forms.PasswordInput())
    confirm_password = forms.CharField(widget=forms.PasswordInput())

    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def clean(self):
        cleaned_data = super().clean()
        senha = cleaned_data.get("password")
        confirm = cleaned_data.get("confirm_password")

        if senha != confirm:
            raise forms.ValidationError("As senhas não coincidem.")

        return cleaned_data
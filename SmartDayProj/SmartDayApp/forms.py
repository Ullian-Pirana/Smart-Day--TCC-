from django import forms
from .models import Casa
from django.contrib.auth.models import User

class CasaForm(forms.ModelForm):
    class Meta:
        model = Casa
        fields = ['nome']

class AddUserForm(forms.Form):
    usuario = forms.CharField(widget=forms.HiddenInput())